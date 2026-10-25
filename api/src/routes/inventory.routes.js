const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// GET /api/v1/inventory/public (any authenticated user)
router.get('/public', authenticate, async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      return await client.query(`
        SELECT branch_id, branch_name, region_code, blood_group, component, units_available
          FROM v_public_inventory
         ORDER BY branch_name, blood_group, component
      `);
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

// GET /api/v1/inventory (officer, admin, auditor, lab_tech)
router.get('/', authenticate, authorizeRoles('bb_officer', 'admin', 'auditor', 'lab_tech'), async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      return await client.query(`
        SELECT branch_id, branch_name, region_code, blood_group, component,
               units_available, units_quarantine, units_reserved,
               nearest_expiry, units_expiring_7d
          FROM v_inventory
         ORDER BY branch_name, blood_group, component
      `);
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

// GET /api/v1/inventory/ledger (officer, admin, auditor, lab_tech) - Partitioned Stock Movement Ledger
router.get('/ledger', authenticate, authorizeRoles('bb_officer', 'admin', 'auditor', 'lab_tech'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const { unit_id, region_code, movement_type } = req.query;
    let whereClause = ' WHERE 1=1';
    const params = [];

    if (unit_id) {
      params.push(parseInt(unit_id, 10));
      whereClause += ` AND sm.unit_id = $${params.length}`;
    }
    if (region_code) {
      params.push(region_code.toUpperCase());
      whereClause += ` AND sm.region_code = $${params.length}`;
    }
    if (movement_type) {
      params.push(movement_type);
      whereClause += ` AND sm.movement_type = $${params.length}`;
    }

    const { total, rows } = await withContext(req.user, async (client) => {
      const countRes = await client.query(`SELECT count(*)::int AS total FROM stock_movement sm ${whereClause}`, params);
      const dataRes = await client.query(`
        SELECT sm.movement_id, sm.unit_id, sm.region_code, sm.movement_type,
               sm.performed_by, u.full_name AS performed_by_name,
               sm.moved_at, sm.note,
               bu.unit_code, bu.component, bu.status AS current_status
          FROM stock_movement sm
          LEFT JOIN app_user u ON u.user_id = sm.performed_by
          LEFT JOIN blood_unit bu ON bu.unit_id = sm.unit_id
        ${whereClause}
         ORDER BY sm.moved_at DESC, sm.movement_id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]);

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

module.exports = router;
