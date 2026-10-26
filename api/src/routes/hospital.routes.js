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
    const { hospital_name, region_code, phone, address, latitude, longitude, is_verified } = req.body;

    if (!hospital_name || !region_code || !phone) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hospital_name, region_code, and phone are required'
        }
      });
    }

    const verifiedFlag = Boolean(is_verified);

    const row = await withContext(req.user, async (client) => {
      const q = `
        INSERT INTO hospital (hospital_name, region_code, phone, is_verified, latitude, longitude)
        VALUES ($1, upper($2), $3, $4, $5, $6)
        RETURNING hospital_id, hospital_name, region_code, phone, is_verified, created_at
      `;
      const resQuery = await client.query(q, [
        hospital_name.trim(),
        region_code.trim(),
        phone.trim(),
        verifiedFlag,
        latitude || null,
        longitude || null
      ]);
      return resQuery.rows[0];
    });

    await audit(req, 'REQUEST_CREATED', 'hospital', row.hospital_id, {
      hospital_name: row.hospital_name,
      region_code: row.region_code,
      is_verified: verifiedFlag
    });

    return res.status(201).json({
      data: row
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/hospitals/:hospital_id/verify (admin only)
router.patch('/:hospital_id/verify', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const hospitalId = parseInt(req.params.hospital_id, 10);
    if (isNaN(hospitalId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid hospital_id parameter'
        }
      });
    }

    const isVerified = req.body.is_verified !== undefined ? Boolean(req.body.is_verified) : true;

    const row = await withContext(req.user, async (client) => {
      const q = `
        UPDATE hospital
           SET is_verified = $1
         WHERE hospital_id = $2
        RETURNING hospital_id, hospital_name, region_code, phone, is_verified, created_at
      `;
      const resQuery = await client.query(q, [isVerified, hospitalId]);
      if (resQuery.rows.length === 0) {
        const error = new Error('Hospital not found');
        error.status = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }
      return resQuery.rows[0];
    });

    await audit(req, isVerified ? 'HOSPITAL_VERIFIED' : 'HOSPITAL_UNVERIFIED', 'hospital', hospitalId, {
      hospital_name: row.hospital_name,
      is_verified: isVerified
    });

    return res.status(200).json({
      data: row,
      message: `Hospital #${hospitalId} verification status set to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
