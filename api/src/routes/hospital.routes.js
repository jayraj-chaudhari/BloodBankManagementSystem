const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/hospitals (any authenticated user)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { region_code, is_verified } = req.query;
    let query = `
      SELECT hospital_id, hospital_name, region_code, phone, is_verified,
             (address).line1 AS line1, (address).city AS city,
             (address).state AS state, (address).pincode AS pincode,
             latitude, longitude, created_at
        FROM hospital
       WHERE 1=1
    `;
    const params = [];

    if (region_code) {
      params.push(region_code.toUpperCase());
      query += ` AND region_code = $${params.length}`;
    }

    if (is_verified !== undefined) {
      params.push(is_verified === 'true');
      query += ` AND is_verified = $${params.length}`;
    }

    query += ` ORDER BY hospital_id`;

    const result = await pool.query(query, params);

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
