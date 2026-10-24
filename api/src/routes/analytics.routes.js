const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// Default SQL queries to execute if db/queries/<name>.sql has not yet been authored by Person C
const DEFAULT_ANALYTICS_QUERIES = {
  'stock-running-total': `
    SELECT u.created_at::date AS day,
           dn.blood_group,
           count(u.unit_id) AS daily_units,
           sum(count(u.unit_id)) OVER (PARTITION BY dn.blood_group ORDER BY u.created_at::date) AS running_total
      FROM blood_unit u
      JOIN donation d ON d.donation_id = u.donation_id
      JOIN donor dn   ON dn.donor_id   = d.donor_id
     GROUP BY u.created_at::date, dn.blood_group
     ORDER BY day DESC, dn.blood_group;
  `,
  'demand-rolling-avg': `
    WITH daily_demand AS (
      SELECT created_at::date AS req_date,
             sum(units_needed) AS daily_units
        FROM blood_request
       GROUP BY created_at::date
    )
    SELECT req_date,
           daily_units,
           round(avg(daily_units) OVER (
             ORDER BY req_date
             ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
           ), 2) AS rolling_7day_avg
      FROM daily_demand
     ORDER BY req_date DESC;
  `,
  'donor-ranking': `
    SELECT dn.donor_id,
           u.full_name,
           dn.region_code,
           count(d.donation_id)::int AS donation_count,
           dense_rank() OVER (PARTITION BY dn.region_code ORDER BY count(d.donation_id) DESC) AS rank_in_region
      FROM donor dn
      JOIN app_user u ON u.user_id = dn.user_id
      LEFT JOIN donation d ON d.donor_id = dn.donor_id
     GROUP BY dn.donor_id, u.full_name, dn.region_code
     ORDER BY dn.region_code, rank_in_region ASC;
  `,
  'donation-gaps': `
    SELECT d.donor_id,
           d.donation_id,
           d.donated_at::date AS current_donation,
           lag(d.donated_at::date) OVER (PARTITION BY d.donor_id ORDER BY d.donated_at) AS previous_donation,
           d.donated_at::date - lag(d.donated_at::date) OVER (PARTITION BY d.donor_id ORDER BY d.donated_at) AS days_between_donations
      FROM donation d
     ORDER BY d.donor_id, d.donated_at;
  `,
  'fefo-candidates': `
    SELECT u.unit_id,
           u.unit_code,
           dn.blood_group,
           u.component,
           u.expires_on,
           row_number() OVER (PARTITION BY dn.blood_group, u.component ORDER BY u.expires_on ASC) AS fefo_priority
      FROM blood_unit u
      JOIN donation d ON d.donation_id = u.donation_id
      JOIN donor dn   ON dn.donor_id   = d.donor_id
     WHERE u.status = 'AVAILABLE'
       AND u.expires_on >= CURRENT_DATE
     ORDER BY dn.blood_group, u.component, fefo_priority;
  `,
  'branch-hierarchy-stock': `
    WITH RECURSIVE branch_tree AS (
      SELECT branch_id, branch_name, parent_branch_id, 1 AS depth
        FROM branch
       WHERE parent_branch_id IS NULL
      UNION ALL
      SELECT b.branch_id, b.branch_name, b.parent_branch_id, bt.depth + 1
        FROM branch b
        JOIN branch_tree bt ON bt.branch_id = b.parent_branch_id
    )
    SELECT bt.branch_id, bt.branch_name, bt.depth,
           count(u.unit_id)::int AS stock_count
      FROM branch_tree bt
      LEFT JOIN donation d   ON d.branch_id = bt.branch_id
      LEFT JOIN blood_unit u ON u.donation_id = d.donation_id AND u.status = 'AVAILABLE'
     GROUP BY bt.branch_id, bt.branch_name, bt.depth
     ORDER BY bt.depth, bt.branch_name;
  `,
  'expiry-risk': `
    SELECT u.component,
           dn.blood_group,
           count(u.unit_id)::int AS at_risk_count,
           min(u.expires_on) AS nearest_expiry
      FROM blood_unit u
      JOIN donation d ON d.donation_id = u.donation_id
      JOIN donor dn   ON dn.donor_id   = d.donor_id
     WHERE u.status = 'AVAILABLE'
       AND u.expires_on BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
     GROUP BY u.component, dn.blood_group
    HAVING count(u.unit_id) > 0
     ORDER BY nearest_expiry ASC;
  `,
  'shortage-report': `
    SELECT b.branch_id,
           b.branch_name,
           dn.blood_group,
           u.component,
           count(u.unit_id)::int AS available_units
      FROM branch b
      CROSS JOIN (SELECT DISTINCT blood_group FROM donor) dn
      CROSS JOIN (SELECT DISTINCT component FROM component_spec) u_spec
      LEFT JOIN donation d ON d.branch_id = b.branch_id
      LEFT JOIN donor dnr  ON dnr.donor_id = d.donor_id AND dnr.blood_group = dn.blood_group
      LEFT JOIN blood_unit u ON u.donation_id = d.donation_id AND u.component = u_spec.component AND u.status = 'AVAILABLE'
     GROUP BY b.branch_id, b.branch_name, dn.blood_group, u.component
    HAVING count(u.unit_id) < 5
     ORDER BY available_units ASC;
  `,
  'lab-positivity-rate': `
    SELECT s.test_type,
           count(*)::int AS total_tests,
           count(CASE WHEN s.result = 'POSITIVE' THEN 1 END)::int AS positive_count,
           round((count(CASE WHEN s.result = 'POSITIVE' THEN 1 END)::numeric / NULLIF(count(*), 0) * 100), 2) AS positivity_percentage
      FROM screening_result s
     GROUP BY s.test_type
     ORDER BY s.test_type;
  `
};

// GET /api/v1/analytics/:name
router.get('/:name', authenticate, async (req, res, next) => {
  try {
    const { name } = req.params;

    // Specific role restriction for lab-positivity-rate per spec
    if (name === 'lab-positivity-rate') {
      if (!['lab_tech', 'auditor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only lab technicians, auditors, and administrators may view lab positivity rates'
          }
        });
      }
    } else {
      if (!['bb_officer', 'admin', 'auditor'].includes(req.user.role)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to view analytics'
          }
        });
      }
    }

    // Try reading SQL file from db/queries/<name>.sql
    let sql = null;
    const filePath = path.join(__dirname, '../../../db/queries', `${name}.sql`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content.length > 0) {
        sql = content;
      }
    }

    // Fall back to default query if file doesn't exist or is empty
    if (!sql) {
      sql = DEFAULT_ANALYTICS_QUERIES[name];
    }

    if (!sql) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Analytics query '${name}' is not recognized`
        }
      });
    }

    const rows = await withContext(req.user, async (client) => {
      const resQuery = await client.query(sql);
      return resQuery.rows;
    });

    return res.status(200).json({
      data: rows,
      meta: {
        page: 1,
        limit: rows.length,
        total: rows.length
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
