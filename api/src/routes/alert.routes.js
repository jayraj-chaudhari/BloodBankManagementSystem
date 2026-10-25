const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { createAlertSchema, respondAlertSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');
const { emitEmergencyAlert, emitAlertResponse } = require('../services/socketService');

// GET /api/v1/requests/:request_id/candidate-donors (officer/admin: preview candidates within radius before dispatching)
router.get('/requests/:request_id/candidate-donors', authenticate, authorizeRoles('bb_officer', 'admin'), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const radiusKm = parseFloat(req.query.radius_km) || 25;
    const maxDonors = parseInt(req.query.max_donors, 10) || 10;

    const result = await withContext(req.user, async (client) => {
      // 1. Get request and hospital
      const reqRes = await client.query(`
        SELECT r.request_id, r.blood_group, r.component, r.urgency, r.units_needed,
               h.hospital_id, h.hospital_name, h.latitude, h.longitude, h.region_code
          FROM blood_request r
          JOIN hospital h ON h.hospital_id = r.hospital_id
         WHERE r.request_id = $1
      `, [requestId]);

      if (reqRes.rows.length === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Blood request not found' };
      }

      const request = reqRes.rows[0];

      // 2. Query candidates using fn_distance_km Haversine calculation
      const donorRes = await client.query(`
        SELECT d.donor_id, u.full_name AS donor_name, d.blood_group, d.region_code,
               d.is_available,
               round(fn_distance_km(h.latitude, h.longitude, d.latitude, d.longitude)::numeric, 2) AS distance_km,
               EXISTS (
                 SELECT 1 FROM donor_alert da WHERE da.request_id = $1 AND da.donor_id = d.donor_id
               ) AS already_alerted
          FROM donor d
          JOIN app_user u ON u.user_id = d.user_id
          CROSS JOIN (SELECT $2::numeric AS latitude, $3::numeric AS longitude) h
         WHERE d.is_available = true
           AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
           AND d.blood_group = ANY (fn_compatible_donor_groups($4, $5))
           AND fn_distance_km(h.latitude, h.longitude, d.latitude, d.longitude) <= $6
         ORDER BY distance_km ASC
         LIMIT $7
      `, [
        requestId,
        request.latitude,
        request.longitude,
        request.blood_group,
        request.component,
        radiusKm,
        maxDonors
      ]);

      return {
        request,
        candidates: donorRes.rows
      };
    });

    return res.status(200).json({
      data: result.candidates,
      meta: {
        request_id: requestId,
        blood_group: result.request.blood_group,
        component: result.request.component,
        hospital_name: result.request.hospital_name,
        radius_km: radiusKm,
        total_candidates: result.candidates.length
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/requests/:request_id/alerts (officer only)
router.post('/requests/:request_id/alerts', authenticate, authorizeRoles('bb_officer', 'admin'), validate(createAlertSchema), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const { radius_km, max_donors } = req.body;
    let requestMeta = null;

    const createdAlerts = await withContext(req.user, async (client) => {
      // 1. Get request and hospital location
      const reqRes = await client.query(`
        SELECT r.request_id, r.blood_group, r.component, r.urgency,
               h.hospital_name, h.latitude, h.longitude, r.status
          FROM blood_request r
          JOIN hospital h ON h.hospital_id = r.hospital_id
         WHERE r.request_id = $1
      `, [requestId]);

      if (reqRes.rows.length === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Blood request not found' };
      }

      const request = reqRes.rows[0];
      requestMeta = request;

      // 2. Find eligible compatible donors within radius_km
      const donorRes = await client.query(`
        SELECT d.donor_id,
               round(fn_distance_km(h.latitude, h.longitude, d.latitude, d.longitude)::numeric, 2) AS distance_km
          FROM donor d
          CROSS JOIN (SELECT $2::numeric AS latitude, $3::numeric AS longitude) h
         WHERE d.is_available = true
           AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
           AND d.blood_group = ANY (fn_compatible_donor_groups($4, $5))
           AND fn_distance_km(h.latitude, h.longitude, d.latitude, d.longitude) <= $6
           AND NOT EXISTS (
             SELECT 1 FROM donor_alert da WHERE da.request_id = $1 AND da.donor_id = d.donor_id
           )
         ORDER BY distance_km ASC
         LIMIT $7
      `, [
        requestId,
        request.latitude,
        request.longitude,
        request.blood_group,
        request.component,
        radius_km,
        max_donors
      ]);

      const alerts = [];
      for (const donor of donorRes.rows) {
        const insRes = await client.query(`
          INSERT INTO donor_alert (request_id, donor_id, distance_km, response)
          VALUES ($1, $2, $3, 'PENDING')
          RETURNING alert_id, request_id, donor_id, distance_km, response, sent_at
        `, [requestId, donor.donor_id, donor.distance_km]);
        alerts.push(insRes.rows[0]);
      }

      return alerts;
    });

    await audit(req, 'REQUEST_CREATED', 'donor_alert', requestId, {
      alerts_sent: createdAlerts.length,
      radius_km
    });

    // Real-time Socket.IO emission
    emitEmergencyAlert({
      request_id: requestId,
      blood_group: requestMeta?.blood_group,
      component: requestMeta?.component,
      urgency: requestMeta?.urgency,
      hospital_name: requestMeta?.hospital_name,
      alerts_count: createdAlerts.length,
      donor_ids: createdAlerts.map(a => a.donor_id),
      radius_km
    });

    return res.status(201).json({
      data: createdAlerts,
      meta: {
        page: 1,
        limit: createdAlerts.length,
        total: createdAlerts.length
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/requests/:request_id/alerts (officer only)
router.get('/requests/:request_id/alerts', authenticate, authorizeRoles('bb_officer', 'admin'), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const rows = await withContext(req.user, async (client) => {
      const q = `
        SELECT da.alert_id, da.request_id, da.donor_id, da.distance_km,
               da.sent_at, da.response, da.responded_at,
               dn.blood_group, u.full_name AS donor_name
          FROM donor_alert da
          JOIN donor dn ON dn.donor_id = da.donor_id
          JOIN app_user u ON u.user_id = dn.user_id
         WHERE da.request_id = $1
         ORDER BY da.sent_at DESC
      `;
      const resQuery = await client.query(q, [requestId]);
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

// GET /api/v1/alerts/me (donor only)
router.get('/alerts/me', authenticate, authorizeRoles('donor'), async (req, res, next) => {
  try {
    const rows = await withContext(req.user, async (client) => {
      const q = `
        SELECT da.alert_id, da.request_id, da.distance_km, da.response,
               da.sent_at, da.responded_at,
               r.blood_group, r.component, r.urgency,
               h.hospital_name, (h.address).city AS hospital_city
          FROM donor_alert da
          JOIN donor dn ON dn.donor_id = da.donor_id
          JOIN blood_request r ON r.request_id = da.request_id
          JOIN hospital h ON h.hospital_id = r.hospital_id
         WHERE dn.user_id = $1
         ORDER BY da.sent_at DESC
      `;
      const resQuery = await client.query(q, [req.user.user_id]);
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

// POST /api/v1/alerts/:alert_id/respond (donor only)
router.post('/alerts/:alert_id/respond', authenticate, authorizeRoles('donor'), validate(respondAlertSchema), async (req, res, next) => {
  try {
    const alertId = parseInt(req.params.alert_id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid alert_id' } });
    }

    const { response } = req.body;

    const row = await withContext(req.user, async (client) => {
      const q = `
        UPDATE donor_alert da
           SET response = $1, responded_at = now()
          FROM donor dn
         WHERE da.alert_id = $2
           AND da.donor_id = dn.donor_id
           AND dn.user_id = $3
     RETURNING da.alert_id, da.request_id, da.donor_id, da.response, da.responded_at
      `;
      const resQuery = await client.query(q, [response, alertId, req.user.user_id]);
      return resQuery.rows[0];
    });

    if (!row) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found or does not belong to you'
        }
      });
    }

    // Real-time Socket.IO emission
    emitAlertResponse({
      alert_id: row.alert_id,
      request_id: row.request_id,
      donor_id: row.donor_id,
      response: row.response,
      responded_at: row.responded_at
    });

    return res.status(200).json({ data: row });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
