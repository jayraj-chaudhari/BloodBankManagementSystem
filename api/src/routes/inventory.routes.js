const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// GET /api/v1/inventory/public (any authenticated user)
router.get('/public', authenticate, async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      // First attempt querying view v_public_inventory created in db/views/30_views.sql
      try {
        return await client.query(`
          SELECT branch_id, branch_name, region_code, blood_group, component, units_available
            FROM v_public_inventory
           ORDER BY branch_name, blood_group, component
        `);
      } catch (viewErr) {
        // Fallback to table aggregation if view is not yet created
        return await client.query(`
          SELECT b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component,
                 count(u.unit_id)::int AS units_available
            FROM blood_unit u
            JOIN donation d ON d.donation_id = u.donation_id
            JOIN donor dn   ON dn.donor_id   = d.donor_id
            JOIN branch b   ON b.branch_id   = d.branch_id
           WHERE u.status = 'AVAILABLE'
             AND u.expires_on >= (now() AT TIME ZONE 'Asia/Kolkata')::date
           GROUP BY b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component
           ORDER BY b.branch_name, dn.blood_group, u.component
        `);
      }
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
      // First attempt querying view v_inventory created in db/views/30_views.sql
      try {
        return await client.query(`
          SELECT branch_id, branch_name, region_code, blood_group, component,
                 units_available, units_quarantine, units_reserved,
                 nearest_expiry, units_expiring_7d
            FROM v_inventory
           ORDER BY branch_name, blood_group, component
        `);
      } catch (viewErr) {
        // Fallback query if view not yet applied
        return await client.query(`
          SELECT b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component,
                 count(CASE WHEN u.status = 'AVAILABLE' AND u.expires_on >= CURRENT_DATE THEN 1 END)::int AS units_available,
                 count(CASE WHEN u.status = 'QUARANTINE' THEN 1 END)::int AS units_quarantine,
                 count(CASE WHEN u.status = 'RESERVED' THEN 1 END)::int AS units_reserved,
                 min(CASE WHEN u.status = 'AVAILABLE' AND u.expires_on >= CURRENT_DATE THEN u.expires_on END) AS nearest_expiry,
                 count(CASE WHEN u.status = 'AVAILABLE' AND u.expires_on BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7) THEN 1 END)::int AS units_expiring_7d
            FROM blood_unit u
            JOIN donation d ON d.donation_id = u.donation_id
            JOIN donor dn   ON dn.donor_id   = d.donor_id
            JOIN branch b   ON b.branch_id   = d.branch_id
           WHERE u.status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED')
           GROUP BY b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component
           ORDER BY b.branch_name, dn.blood_group, u.component
        `);
      }
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
