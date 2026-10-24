const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { createRequestSchema, updateRequestStatusSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');
const { emitRequestCreated, emitInventoryUpdate } = require('../services/socketService');

// POST /api/v1/requests (hospital_user, bb_officer, admin)
router.post('/', authenticate, authorizeRoles('hospital_user', 'bb_officer', 'admin'), validate(createRequestSchema), async (req, res, next) => {
  try {
    const { patient_ref, blood_group, component, units_needed, urgency, needed_by } = req.body;
    let hospitalId = req.user.hospital_id;

    if (['bb_officer', 'admin'].includes(req.user.role)) {
      hospitalId = req.body.hospital_id || hospitalId;
    }

    if (!hospitalId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hospital_id is required'
        }
      });
    }

    const row = await withContext(req.user, async (client) => {
      const q = `
        INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed, urgency, needed_by, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
        RETURNING request_id, hospital_id, requested_by, patient_ref, blood_group, component, units_needed, urgency, needed_by, status, created_at
      `;
      const resQuery = await client.query(q, [
        hospitalId,
        req.user.user_id,
        patient_ref,
        blood_group,
        component,
        units_needed,
        urgency,
        needed_by || null
      ]);
      return resQuery.rows[0];
    });

    await audit(req, 'REQUEST_CREATED', 'blood_request', row.request_id, {
      hospital_id: hospitalId,
      blood_group,
      component,
      units_needed
    });

    // Real-time Socket.IO emission
    emitRequestCreated({
      request_id: row.request_id,
      hospital_id: row.hospital_id,
      blood_group: row.blood_group,
      component: row.component,
      units_needed: row.units_needed,
      urgency: row.urgency
    });

    return res.status(201).json({
      data: {
        request_id: row.request_id,
        status: row.status,
        patient_ref: row.patient_ref,
        units_needed: row.units_needed
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/requests (officer/admin/auditor: all; hospital_user: own hospital only via RLS/view)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { status, urgency, blood_group, component } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];

    // Enforce hospital tenant isolation for hospital_user if RLS is bypassed in direct query
    if (req.user.role === 'hospital_user') {
      params.push(req.user.hospital_id);
      whereClause += ` AND r.hospital_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }
    if (urgency) {
      params.push(urgency);
      whereClause += ` AND r.urgency = $${params.length}`;
    }
    if (blood_group) {
      params.push(blood_group);
      whereClause += ` AND r.blood_group = $${params.length}`;
    }
    if (component) {
      params.push(component);
      whereClause += ` AND r.component = $${params.length}`;
    }

    const { total, rows } = await withContext(req.user, async (client) => {
      // First attempt querying v_request_summary
      try {
        const countRes = await client.query(`SELECT count(*)::int AS total FROM v_request_summary r ${whereClause}`, params);
        const dataRes = await client.query(`
          SELECT r.request_id, r.hospital_id, r.hospital_name, r.blood_group, r.component,
                 r.units_needed, r.units_allocated, r.urgency, r.status, r.needed_by,
                 r.created_at, r.updated_at
            FROM v_request_summary r
          ${whereClause}
           ORDER BY CASE r.urgency WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
                    r.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return { total: countRes.rows[0].total, rows: dataRes.rows };
      } catch (viewErr) {
        // Fallback to direct table join if view has not yet been loaded
        const countRes = await client.query(`SELECT count(*)::int AS total FROM blood_request r ${whereClause}`, params);
        const dataRes = await client.query(`
          SELECT r.request_id, r.hospital_id, r.requested_by, r.patient_ref,
                 r.blood_group, r.component, r.units_needed, r.urgency, r.status,
                 r.needed_by, r.created_at, r.updated_at,
                 h.hospital_name, h.region_code,
                 (SELECT count(*)::int FROM request_allocation ra WHERE ra.request_id = r.request_id) AS units_allocated
            FROM blood_request r
            JOIN hospital h ON h.hospital_id = r.hospital_id
          ${whereClause}
           ORDER BY CASE r.urgency WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
                    r.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return { total: countRes.rows[0].total, rows: dataRes.rows };
      }
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

// GET /api/v1/requests/:request_id
router.get('/:request_id', authenticate, async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const data = await withContext(req.user, async (client) => {
      let query = `
        SELECT r.request_id, r.hospital_id, r.requested_by, r.patient_ref,
               r.blood_group, r.component, r.units_needed, r.urgency, r.status,
               r.needed_by, r.created_at, r.updated_at,
               h.hospital_name, h.region_code
          FROM blood_request r
          JOIN hospital h ON h.hospital_id = r.hospital_id
         WHERE r.request_id = $1
      `;
      const params = [requestId];

      if (req.user.role === 'hospital_user') {
        params.push(req.user.hospital_id);
        query += ` AND r.hospital_id = $2`;
      }

      const resQuery = await client.query(query, params);
      if (resQuery.rows.length === 0) return null;

      const request = resQuery.rows[0];

      // Fetch allocated units
      const allocRes = await client.query(`
        SELECT ra.allocation_id, ra.unit_id, ra.allocated_at,
               u.unit_code, u.component, u.expires_on
          FROM request_allocation ra
          JOIN blood_unit u ON u.unit_id = ra.unit_id
         WHERE ra.request_id = $1
      `, [requestId]);

      request.allocations = allocRes.rows;
      return request;
    });

    if (!data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    }

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/requests/:request_id/allocate (bb_officer only)
router.post('/:request_id/allocate', authenticate, authorizeRoles('bb_officer', 'admin'), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const allocatedCount = await withContext(req.user, async (client) => {
      const procRes = await client.query(
        `SELECT fn_allocate_fefo($1, $2) AS count`,
        [requestId, req.user.user_id]
      );
      return procRes.rows[0]?.count || 0;
    });

    await audit(req, 'UNIT_ALLOCATED', 'blood_request', requestId, {
      allocated_count: allocatedCount
    });

    // Real-time inventory broadcast
    emitInventoryUpdate({
      action: 'FEFO_ALLOCATION',
      request_id: requestId,
      allocated_units: Number(allocatedCount)
    });

    return res.status(200).json({
      data: {
        request_id: requestId,
        allocated_units: Number(allocatedCount),
        message: 'Units allocated successfully via FEFO'
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/requests/:request_id/status (officer; hospital_user can cancel own pending request)
router.patch('/:request_id/status', authenticate, validate(updateRequestStatusSchema), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const { status } = req.body;

    if (req.user.role === 'hospital_user') {
      if (status !== 'CANCELLED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Hospital users may only cancel pending requests'
          }
        });
      }
    }

    const row = await withContext(req.user, async (client) => {
      let q = `
        UPDATE blood_request
           SET status = $1, updated_at = now()
         WHERE request_id = $2
      `;
      const params = [status, requestId];

      if (req.user.role === 'hospital_user') {
        params.push(req.user.hospital_id);
        q += ` AND hospital_id = $3 AND status = 'PENDING'`;
      }

      q += ` RETURNING request_id, hospital_id, patient_ref, status, updated_at`;

      const resQuery = await client.query(q, params);
      return resQuery.rows[0];
    });

    if (!row) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Request not found or cannot be transitioned to that status'
        }
      });
    }

    return res.status(200).json({ data: row });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
