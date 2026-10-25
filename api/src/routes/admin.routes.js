const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pg');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { createUserSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');
const { emitInventoryUpdate } = require('../services/socketService');

// GET /api/v1/admin/users (admin only - Column DAC enforces no password_hash)
router.get('/users', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const rows = await withContext(req.user, async (client) => {
      const q = `
        SELECT u.user_id, u.email, u.full_name, u.role_name,
               u.branch_id, b.branch_name,
               u.hospital_id, h.hospital_name,
               u.is_active, u.failed_attempts, u.locked_until, u.created_at
          FROM app_user u
          LEFT JOIN branch b ON b.branch_id = u.branch_id
          LEFT JOIN hospital h ON h.hospital_id = u.hospital_id
         ORDER BY u.user_id DESC
      `;
      const resQuery = await client.query(q);
      return resQuery.rows;
    });

    return res.status(200).json({
      data: rows,
      meta: { total: rows.length }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/users (admin only)
router.post('/users', authenticate, authorizeRoles('admin'), validate(createUserSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, role_name, branch_id, hospital_id } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    if (role_name === 'donor') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Donor accounts cannot be created by administrators; donors must self-register (least privilege)'
        }
      });
    }

    if (role_name === 'hospital_user' && !hospital_id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hospital_id is required for hospital_user role'
        }
      });
    }
    if (['bb_officer', 'lab_tech'].includes(role_name) && !branch_id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'branch_id is required for blood bank officer and lab technician roles (Integrity constraint)'
        }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const createdUser = await withContext(req.user, async (client) => {
      const result = await client.query(
        `INSERT INTO app_user (email, password_hash, full_name, role_name, branch_id, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, email, full_name, role_name, branch_id, hospital_id, created_at`,
        [cleanEmail, passwordHash, full_name, role_name, branch_id || null, hospital_id || null]
      );
      return result.rows[0];
    });

    await audit(req, 'REQUEST_CREATED', 'app_user', createdUser.user_id, {
      email: cleanEmail,
      role: role_name
    });

    return res.status(201).json({
      data: createdUser
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/expire-units (admin, bb_officer)
router.post('/expire-units', authenticate, authorizeRoles('admin', 'bb_officer'), async (req, res, next) => {
  try {
    let expiredCount = 0;
    try {
      const procRes = await pool.query(`SELECT fn_expire_units() AS count`);
      expiredCount = procRes.rows[0]?.count || 0;
    } catch (procErr) {
      const updateRes = await pool.query(
        `UPDATE blood_unit
            SET status = 'EXPIRED'
          WHERE expires_on < (now() AT TIME ZONE 'Asia/Kolkata')::date
            AND status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED')`
      );
      expiredCount = updateRes.rowCount;
    }

    await audit(req, 'UNIT_STATUS_CHANGED', 'blood_unit', null, {
      action: 'expire_sweep',
      expired_count: expiredCount
    });

    // Real-time inventory broadcast
    emitInventoryUpdate({
      action: 'EXPIRE_SWEEP',
      expired_count: Number(expiredCount)
    });

    return res.status(200).json({
      data: {
        expired_units: Number(expiredCount)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
