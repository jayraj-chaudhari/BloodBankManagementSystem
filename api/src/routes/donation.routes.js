const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { createDonationSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');

// POST /api/v1/donations (officer only)
router.post('/', authenticate, authorizeRoles('bb_officer', 'admin'), validate(createDonationSchema), async (req, res, next) => {
  try {
    const { donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, components } = req.body;
    const collectedBy = req.user.user_id;

    const result = await withContext(req.user, async (client) => {
      // 1. Insert donation record (trigger trg_donation_gap_check validates gap)
      const donationRes = await client.query(
        `INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING donation_id, donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, created_at`,
        [donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collectedBy]
      );
      const donationId = donationRes.rows[0].donation_id;

      // 2. Insert blood units for each requested component
      // Note: trigger trg_unit_set_expiry automatically generates unit_code and expires_on!
      const units = [];
      const unitVolume = Math.floor(volume_ml / components.length);

      for (const component of components) {
        // If trigger is not active, fallback unit code & expiry calculation will take over
        const unitRes = await client.query(
          `INSERT INTO blood_unit (donation_id, component, volume_ml, status, storage_location, expires_on, unit_code)
           VALUES (
             $1, $2, $3, 'QUARANTINE', 'INTAKE_BAY',
             COALESCE(
               (SELECT ($4::timestamptz + make_interval(days => shelf_life_days))::date FROM component_spec WHERE component = $2),
               CURRENT_DATE + 35
             ),
             COALESCE(
               'UNIT-' || $1 || '-' || $2 || '-' || floor(random() * 9000 + 1000),
               'TEMP'
             )
           )
           RETURNING unit_id, unit_code, component, expires_on, status`,
          [donationId, component, unitVolume, donated_at]
        );
        units.push(unitRes.rows[0]);
      }

      return {
        donation_id: donationId,
        units
      };
    });

    // 3. Log audit trail
    await audit(req, 'DONATION_CREATED', 'donation', result.donation_id, {
      donor_id,
      branch_id,
      unit_count: result.units.length
    });

    return res.status(201).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/donations (officer, lab_tech, admin, auditor)
router.get('/', authenticate, authorizeRoles('bb_officer', 'lab_tech', 'admin', 'auditor'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { donor_id, branch_id, from, to } = req.query;
    let whereClause = ' WHERE 1=1';
    const params = [];

    if (donor_id) {
      params.push(parseInt(donor_id, 10));
      whereClause += ` AND d.donor_id = $${params.length}`;
    }
    if (branch_id) {
      params.push(parseInt(branch_id, 10));
      whereClause += ` AND d.branch_id = $${params.length}`;
    }
    if (from) {
      params.push(from);
      whereClause += ` AND d.donated_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND d.donated_at <= $${params.length}`;
    }

    const countQuery = `SELECT count(*)::int AS total FROM donation d ${whereClause}`;
    const dataQuery = `
      SELECT d.donation_id, d.donor_id, d.branch_id, d.donated_at, d.volume_ml,
             d.hemoglobin_gdl, d.collected_by, d.created_at,
             b.branch_name, dn.blood_group, u.full_name AS donor_name
        FROM donation d
        JOIN branch b ON b.branch_id = d.branch_id
        JOIN donor dn ON dn.donor_id = d.donor_id
        JOIN app_user u ON u.user_id = dn.user_id
      ${whereClause}
       ORDER BY d.donated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const { total, rows } = await withContext(req.user, async (client) => {
      const countRes = await client.query(countQuery, params);
      const dataRes = await client.query(dataQuery, [...params, limit, offset]);
      return { total: countRes.rows[0].total, rows: dataRes.rows };
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

// GET /api/v1/donations/me (donor only)
router.get('/me', authenticate, authorizeRoles('donor'), async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      return client.query(
        `SELECT d.donation_id, d.branch_id, d.donated_at, d.volume_ml,
                d.hemoglobin_gdl, b.branch_name, d.created_at
           FROM donation d
           JOIN branch b ON b.branch_id = d.branch_id
           JOIN donor dn ON dn.donor_id = d.donor_id
          WHERE dn.user_id = $1
          ORDER BY d.donated_at DESC`,
        [req.user.user_id]
      );
    });

    return res.status(200).json({
      data: result.rows,
      meta: {
        page: 1,
        limit: result.rows.length,
        total: result.rows.length
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
