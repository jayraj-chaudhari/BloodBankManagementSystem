const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { updateDonorSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');

// GET /api/v1/donors/me (donor only)
router.get('/me', authenticate, authorizeRoles('donor'), async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      const q = `
        SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
               d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
               u.full_name, u.email,
               v.last_donated_at, v.next_eligible_on, v.is_eligible
          FROM donor d
          JOIN app_user u ON u.user_id = d.user_id
     LEFT JOIN v_donor_eligibility v ON v.donor_id = d.donor_id
         WHERE d.user_id = $1
      `;
      try {
        return await client.query(q, [req.user.user_id]);
      } catch (e) {
        // Fallback without view
        return await client.query(`
          SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
                 d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
                 u.full_name, u.email
            FROM donor d
            JOIN app_user u ON u.user_id = d.user_id
           WHERE d.user_id = $1
        `, [req.user.user_id]);
      }
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Donor profile not found for this account'
        }
      });
    }

    return res.status(200).json({
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/donors (officer, admin, lab_tech)
router.get('/', authenticate, authorizeRoles('bb_officer', 'admin', 'lab_tech'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { blood_group, region_code, is_available, eligible } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (blood_group) {
      params.push(blood_group);
      whereClause += ` AND d.blood_group = $${params.length}`;
    }

    if (region_code) {
      params.push(region_code.toUpperCase());
      whereClause += ` AND d.region_code = $${params.length}`;
    }

    if (is_available !== undefined) {
      params.push(is_available === 'true');
      whereClause += ` AND d.is_available = $${params.length}`;
    }

    const { total, rows } = await withContext(req.user, async (client) => {
      let eligibleJoin = `LEFT JOIN v_donor_eligibility v ON v.donor_id = d.donor_id`;
      let eligibilitySelect = `, v.last_donated_at, v.next_eligible_on, v.is_eligible`;
      let extraWhere = '';

      if (eligible === 'true') {
        extraWhere = ' AND (v.is_eligible = true OR v.is_eligible IS NULL)';
      }

      try {
        const countRes = await client.query(`
          SELECT count(d.donor_id)::int AS total
            FROM donor d
          ${eligibleJoin}
          ${whereClause} ${extraWhere}
        `, params);

        const dataRes = await client.query(`
          SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
                 d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
                 d.created_at, u.full_name, u.email
                 ${eligibilitySelect}
            FROM donor d
            JOIN app_user u ON u.user_id = d.user_id
          ${eligibleJoin}
          ${whereClause} ${extraWhere}
           ORDER BY d.donor_id DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return { total: countRes.rows[0].total, rows: dataRes.rows };
      } catch (viewErr) {
        // Fallback without v_donor_eligibility view
        const countRes = await client.query(`SELECT count(*)::int AS total FROM donor d ${whereClause}`, params);
        const dataRes = await client.query(`
          SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
                 d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
                 d.created_at, u.full_name, u.email
            FROM donor d
            JOIN app_user u ON u.user_id = d.user_id
          ${whereClause}
           ORDER BY d.donor_id DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return { total: countRes.rows[0].total, rows: dataRes.rows };
      }
    });

    return res.status(200).json({
      data: rows,
      meta: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/donors/:donor_id (officer, admin, lab_tech)
router.get('/:donor_id', authenticate, authorizeRoles('bb_officer', 'admin', 'lab_tech'), async (req, res, next) => {
  try {
    const donorId = parseInt(req.params.donor_id, 10);
    if (isNaN(donorId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid donor_id' } });
    }

    const result = await withContext(req.user, async (client) => {
      try {
        return await client.query(
          `SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
                  d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
                  d.created_at, u.full_name, u.email,
                  v.last_donated_at, v.next_eligible_on, v.is_eligible
             FROM donor d
             JOIN app_user u ON u.user_id = d.user_id
        LEFT JOIN v_donor_eligibility v ON v.donor_id = d.donor_id
            WHERE d.donor_id = $1`,
          [donorId]
        );
      } catch (viewErr) {
        return await client.query(
          `SELECT d.donor_id, d.user_id, d.date_of_birth, d.gender, d.blood_group,
                  d.weight_kg, d.region_code, d.latitude, d.longitude, d.is_available,
                  d.created_at, u.full_name, u.email
             FROM donor d
             JOIN app_user u ON u.user_id = d.user_id
            WHERE d.donor_id = $1`,
          [donorId]
        );
      }
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Donor not found' } });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/donors/:donor_id/contact (officer, donor [own]) - Decrypted & Audited
router.get('/:donor_id/contact', authenticate, async (req, res, next) => {
  try {
    const donorId = parseInt(req.params.donor_id, 10);
    if (isNaN(donorId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid donor_id' } });
    }

    if (req.user.role !== 'bb_officer' && req.user.role !== 'admin') {
      if (req.user.role !== 'donor' || req.user.donor_id !== donorId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own contact information'
          }
        });
      }
    }

    const result = await withContext(req.user, async (client) => {
      try {
        return await client.query(
          `SELECT donor_id,
                  fn_decrypt_text(phone_enc) AS phone,
                  fn_decrypt_text(email_enc) AS email,
                  fn_decrypt_text(address_enc) AS address,
                  key_version, updated_at
             FROM donor_contact
            WHERE donor_id = $1`,
          [donorId]
        );
      } catch (decErr) {
        return await client.query(
          `SELECT donor_id,
                  pgp_sym_decrypt(phone_enc, current_setting('app.enc_key', true)) AS phone,
                  pgp_sym_decrypt(email_enc, current_setting('app.enc_key', true)) AS email,
                  pgp_sym_decrypt(address_enc, current_setting('app.enc_key', true)) AS address,
                  key_version, updated_at
             FROM donor_contact
            WHERE donor_id = $1`,
          [donorId]
        );
      }
    }, { withEncKey: true });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact record not found' } });
    }

    await audit(req, 'PII_VIEWED', 'donor_contact', donorId, {
      viewed_by_role: req.user.role,
      donor_id: donorId
    });

    return res.status(200).json({
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/donors/:donor_id (officer, donor [own])
router.patch('/:donor_id', authenticate, validate(updateDonorSchema), async (req, res, next) => {
  try {
    const donorId = parseInt(req.params.donor_id, 10);
    if (isNaN(donorId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid donor_id' } });
    }

    if (req.user.role !== 'bb_officer' && req.user.role !== 'admin') {
      if (req.user.role !== 'donor' || req.user.donor_id !== donorId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own donor profile'
          }
        });
      }
    }

    const updates = [];
    const params = [donorId];

    if (req.body.weight_kg !== undefined) {
      params.push(req.body.weight_kg);
      updates.push(`weight_kg = $${params.length}`);
    }
    if (req.body.is_available !== undefined) {
      params.push(req.body.is_available);
      updates.push(`is_available = $${params.length}`);
    }
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      params.push(req.body.latitude);
      updates.push(`latitude = $${params.length}`);
      params.push(req.body.longitude);
      updates.push(`longitude = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
    }

    const query = `
      UPDATE donor
         SET ${updates.join(', ')}
       WHERE donor_id = $1
   RETURNING donor_id, user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available
    `;

    const result = await withContext(req.user, async (client) => {
      return client.query(query, params);
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Donor not found' } });
    }

    return res.status(200).json({
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
