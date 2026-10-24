const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { updateUnitStatusSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');

// GET /api/v1/units (officer, lab_tech, admin, auditor)
router.get('/', authenticate, authorizeRoles('bb_officer', 'lab_tech', 'admin', 'auditor'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { status, blood_group, component, region_code, expiring_within_days } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND u.status = $${params.length}`;
    }
    if (component) {
      params.push(component);
      whereClause += ` AND u.component = $${params.length}`;
    }
    if (blood_group) {
      params.push(blood_group);
      whereClause += ` AND dn.blood_group = $${params.length}`;
    }
    if (region_code) {
      params.push(region_code.toUpperCase());
      whereClause += ` AND b.region_code = $${params.length}`;
    }
    if (expiring_within_days) {
      const days = parseInt(expiring_within_days, 10);
      if (!isNaN(days)) {
        params.push(days);
        whereClause += ` AND u.expires_on <= CURRENT_DATE + $${params.length}::int AND u.expires_on >= CURRENT_DATE`;
      }
    }

    const countQuery = `
      SELECT count(*)::int AS total
        FROM blood_unit u
        JOIN donation d ON d.donation_id = u.donation_id
        JOIN donor dn   ON dn.donor_id   = d.donor_id
        JOIN branch b   ON b.branch_id   = d.branch_id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT u.unit_id, u.unit_code, u.component, u.volume_ml, u.status,
             u.storage_location, u.expires_on, u.created_at,
             d.donation_id, d.donated_at, dn.blood_group, b.branch_name, b.region_code
        FROM blood_unit u
        JOIN donation d ON d.donation_id = u.donation_id
        JOIN donor dn   ON dn.donor_id   = d.donor_id
        JOIN branch b   ON b.branch_id   = d.branch_id
      ${whereClause}
       ORDER BY u.expires_on ASC, u.unit_id ASC
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

// PATCH /api/v1/units/:unit_id/status (officer only)
router.patch('/:unit_id/status', authenticate, authorizeRoles('bb_officer', 'admin'), validate(updateUnitStatusSchema), async (req, res, next) => {
  try {
    const unitId = parseInt(req.params.unit_id, 10);
    if (isNaN(unitId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid unit_id' } });
    }

    const { status } = req.body;

    const row = await withContext(req.user, async (client) => {
      const q = `
        UPDATE blood_unit
           SET status = $1
         WHERE unit_id = $2
     RETURNING unit_id, unit_code, component, status, expires_on
      `;
      const resQuery = await client.query(q, [status, unitId]);
      return resQuery.rows[0];
    });

    if (!row) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unit not found' } });
    }

    await audit(req, 'UNIT_STATUS_CHANGED', 'blood_unit', unitId, {
      new_status: status
    });

    return res.status(200).json({
      data: row
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
