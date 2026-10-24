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

module.exports = router;
