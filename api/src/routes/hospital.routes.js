const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const { audit } = require('../services/auditService');

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

// POST /api/v1/hospitals (admin only - DAC enforced by Postgres)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { hospital_name, region_code, phone, address, latitude, longitude } = req.body;

    if (!hospital_name || !region_code || !phone) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hospital_name, region_code, and phone are required'
        }
      });
    }

    const row = await withContext(req.user, async (client) => {
      const q = `
        INSERT INTO hospital (hospital_name, region_code, phone, is_verified, latitude, longitude)
        VALUES ($1, upper($2), $3, false, $4, $5)
        RETURNING hospital_id, hospital_name, region_code, phone, is_verified, created_at
      `;
      const resQuery = await client.query(q, [
        hospital_name.trim(),
        region_code.trim(),
        phone.trim(),
        latitude || null,
        longitude || null
      ]);
      return resQuery.rows[0];
    });

    await audit(req, 'REQUEST_CREATED', 'hospital', row.hospital_id, {
      hospital_name: row.hospital_name,
      region_code: row.region_code,
      is_verified: false
    });

    return res.status(201).json({
      data: row
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
