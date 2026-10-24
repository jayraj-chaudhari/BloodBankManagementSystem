const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// GET /api/v1/inventory/public (any authenticated user)
router.get('/public', authenticate, async (req, res, next) => {
  try {
    const result = await withContext(req.user, async (client) => {
      // Return counts of AVAILABLE units grouped by branch, blood group, and component
      return client.query(`
        SELECT b.branch_id, b.branch_name, dn.blood_group, u.component,
               count(u.unit_id)::int AS units_available
          FROM blood_unit u
          JOIN donation d ON d.donation_id = u.donation_id
          JOIN donor dn   ON dn.donor_id   = d.donor_id
          JOIN branch b   ON b.branch_id   = d.branch_id
         WHERE u.status = 'AVAILABLE'
           AND u.expires_on >= (now() AT TIME ZONE 'Asia/Kolkata')::date
         GROUP BY b.branch_id, b.branch_name, dn.blood_group, u.component
         ORDER BY b.branch_name, dn.blood_group, u.component
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
      // Detailed breakdown including available, quarantine, reserved, and nearest expiry
      return client.query(`
        SELECT b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component,
               count(CASE WHEN u.status = 'AVAILABLE' AND u.expires_on >= CURRENT_DATE THEN 1 END)::int AS available_count,
               count(CASE WHEN u.status = 'QUARANTINE' THEN 1 END)::int AS quarantine_count,
               count(CASE WHEN u.status = 'RESERVED' THEN 1 END)::int AS reserved_count,
               min(CASE WHEN u.status = 'AVAILABLE' AND u.expires_on >= CURRENT_DATE THEN u.expires_on END) AS nearest_expiry
          FROM blood_unit u
          JOIN donation d ON d.donation_id = u.donation_id
          JOIN donor dn   ON dn.donor_id   = d.donor_id
          JOIN branch b   ON b.branch_id   = d.branch_id
         GROUP BY b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component
         ORDER BY b.branch_name, dn.blood_group, u.component
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
