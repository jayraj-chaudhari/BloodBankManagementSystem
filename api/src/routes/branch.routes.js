const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { authenticate } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// GET /api/v1/branches (any authenticated user)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { region_code } = req.query;
    let query = `
      SELECT branch_id, branch_name, region_code, parent_branch_id,
             (address).line1 AS line1, (address).city AS city,
             (address).state AS state, (address).pincode AS pincode,
             latitude, longitude, created_at
        FROM branch
    `;
    const params = [];

    if (region_code) {
      query += ` WHERE region_code = $1`;
      params.push(region_code.toUpperCase());
    }

    query += ` ORDER BY branch_id`;

    const result = await withContext(req.user, async (client) => {
      return await client.query(query, params);
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
