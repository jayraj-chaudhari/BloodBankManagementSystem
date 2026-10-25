const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pg');
const config = require('../config');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerDonorSchema, loginSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');

// POST /api/v1/auth/register-donor (public)
router.post('/register-donor', validate(registerDonorSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      email,
      password,
      full_name,
      date_of_birth,
      gender,
      blood_group,
      weight_kg,
      region_code,
      latitude,
      longitude,
      phone,
      address
    } = req.body;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await client.query('BEGIN');
    // Set encryption key for pgcrypto operations
    await client.query(`SELECT set_config('app.enc_key', $1, true)`, [config.ENC_KEY]);

    let userId, donorId;

    try {
      // Stored procedure created by DB architect
      const procRes = await client.query(
        `SELECT fn_register_donor($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) AS result`,
        [
          email,
          passwordHash,
          full_name,
          date_of_birth,
          gender,
          blood_group,
          weight_kg,
          region_code,
          latitude || null,
          longitude || null,
          phone,
          address || null
        ]
      );
      const regData = procRes.rows[0].result;
      userId = regData.user_id;
      donorId = regData.donor_id;
    } catch (procErr) {
      if (procErr.code === '42883') {
        // Fallback if stored function is not yet installed
        const userRes = await client.query(
          `INSERT INTO app_user (email, password_hash, full_name, role_name)
           VALUES (lower($1), $2, $3, 'donor')
           RETURNING user_id`,
          [email, passwordHash, full_name]
        );
        userId = userRes.rows[0].user_id;

        const donorRes = await client.query(
          `INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING donor_id`,
          [userId, date_of_birth, gender, blood_group, weight_kg, region_code, latitude || null, longitude || null]
        );
        donorId = donorRes.rows[0].donor_id;

        await client.query(
          `INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
           VALUES ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $3), pgp_sym_encrypt($5, $3))`,
          [donorId, phone, config.ENC_KEY, email, address || '']
        );
      } else {
        throw procErr;
      }
    }

    await client.query('COMMIT');

    // Audit trail log
    await audit(
      req,
      'DONATION_CREATED',
      'donor',
      donorId,
      { email: email.toLowerCase(), blood_group, region_code }
    );

    return res.status(201).json({
      data: {
        user_id: userId,
        donor_id: donorId
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/v1/auth/login (public)
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    let user = null;

    // First attempt using the secure fn_auth_lookup() created in 50_rolesgrant.sql
    try {
      const lookupRes = await pool.query(
        `SELECT user_id, password_hash, full_name, role_name, clearance,
                branch_id, hospital_id, donor_id, is_active, failed_attempts, locked_until
           FROM fn_auth_lookup($1)`,
        [cleanEmail]
      );
      if (lookupRes.rows.length > 0) {
        user = lookupRes.rows[0];
      }
    } catch (lookupErr) {
      // Fallback to direct query if fn_auth_lookup has not yet been executed by DBA
      const directRes = await pool.query(
        `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.role_name,
                u.branch_id, u.hospital_id, u.is_active, u.failed_attempts, u.locked_until,
                COALESCE(r.clearance, 1) AS clearance,
                d.donor_id
           FROM app_user u
      LEFT JOIN role_def r ON r.role_name = u.role_name
      LEFT JOIN donor d ON d.user_id = u.user_id
          WHERE u.email = $1`,
        [cleanEmail]
      );
      if (directRes.rows.length > 0) {
        user = directRes.rows[0];
      }
    }

    if (!user) {
      await audit(req, 'LOGIN_FAILED', 'app_user', null, { email: cleanEmail, reason: 'USER_NOT_FOUND' }, false);
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid email or password'
        }
      });
    }

    // Account lock check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await audit(req, 'LOGIN_FAILED', 'app_user', user.user_id, { email: cleanEmail, reason: 'ACCOUNT_LOCKED' }, false);
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked until ${new Date(user.locked_until).toISOString()} due to excessive failed attempts`
        }
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Account has been deactivated'
        }
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Record failure using fn_auth_record_attempt or fallback update
      try {
        await pool.query(`SELECT fn_auth_record_attempt($1, false)`, [user.user_id]);
      } catch (recErr) {
        const nextFailed = (user.failed_attempts || 0) + 1;
        const lockUpdate = nextFailed >= 5 ? `, locked_until = now() + interval '15 minutes'` : '';
        await pool.query(
          `UPDATE app_user SET failed_attempts = $1 ${lockUpdate} WHERE user_id = $2`,
          [nextFailed, user.user_id]
        );
      }

      await audit(req, 'LOGIN_FAILED', 'app_user', user.user_id, { email: cleanEmail }, false);

      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid email or password'
        }
      });
    }

    // Record success (resets failed_attempts counter)
    try {
      await pool.query(`SELECT fn_auth_record_attempt($1, true)`, [user.user_id]);
    } catch (recErr) {
      await pool.query(
        `UPDATE app_user SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1`,
        [user.user_id]
      );
    }

    const payload = {
      user_id: user.user_id,
      role: user.role_name,
      clearance: user.clearance,
      branch_id: user.branch_id,
      hospital_id: user.hospital_id,
      donor_id: user.donor_id
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    req.user = payload;
    await audit(req, 'LOGIN_SUCCESS', 'app_user', user.user_id, { email: cleanEmail });

    return res.status(200).json({
      data: {
        token,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role_name,
          clearance: user.clearance,
          branch_id: user.branch_id,
          hospital_id: user.hospital_id,
          donor_id: user.donor_id
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me (authenticated)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    let user = null;
    const lookupRes = await pool.query(
      `SELECT user_id, email, full_name, role_name, clearance, branch_id, hospital_id, donor_id, is_active FROM fn_auth_lookup_by_id($1)`,
      [req.user.user_id]
    );
    if (lookupRes.rows.length > 0) user = lookupRes.rows[0];

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }

    return res.status(200).json({
      data: {
        ...user,
        role: user.role_name
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
