const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');
const validate = require('../middleware/validate');
const { createScreeningSchema } = require('../validators/schemas');
const { audit } = require('../services/auditService');
const { emitInventoryUpdate } = require('../services/socketService');

// POST /api/v1/screenings (lab_tech only)
router.post('/', authenticate, authorizeRoles('lab_tech', 'admin'), validate(createScreeningSchema), async (req, res, next) => {
  try {
    const { donation_id, test_type, result, report } = req.body;
    const testedBy = req.user.user_id;

    const row = await withContext(req.user, async (client) => {
      const q = `
        INSERT INTO screening_result (donation_id, test_type, result, report, tested_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (donation_id, test_type)
        DO UPDATE SET result = EXCLUDED.result, report = EXCLUDED.report, tested_by = EXCLUDED.tested_by, tested_at = now()
        RETURNING screening_id, donation_id, test_type, result, report, tested_by, tested_at
      `;
      const resQuery = await client.query(q, [donation_id, test_type, result, JSON.stringify(report || {}), testedBy]);
      return resQuery.rows[0];
    });

    await audit(req, 'SCREENING_ENTERED', 'screening_result', row.screening_id, {
      donation_id,
      test_type,
      result
    });

    // Real-time inventory update (since negative screening makes units AVAILABLE, positive marks DISCARDED)
    emitInventoryUpdate({
      action: 'SCREENING_RESULT_RECORDED',
      donation_id: row.donation_id,
      test_type: row.test_type,
      result: row.result
    });

    return res.status(201).json({
      data: row
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/screenings (lab_tech, auditor, admin, donor [own])
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { donation_id } = req.query;
    if (!donation_id) {
      if (req.user.role === 'donor') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'donation_id query parameter is required for donors' } });
      }

      // For lab technicians and auditors: return recent screenings across donations
      const rows = await withContext(req.user, async (client) => {
        const q = `
          SELECT s.screening_id, s.donation_id, s.test_type, s.result, s.report,
                 s.tested_at, u.full_name AS tested_by_name
            FROM screening_result s
            LEFT JOIN app_user u ON u.user_id = s.tested_by
           ORDER BY s.tested_at DESC
           LIMIT 50
        `;
        const resQuery = await client.query(q);
        return resQuery.rows;
      });

      return res.status(200).json({
        data: rows,
        meta: { page: 1, limit: rows.length, total: rows.length }
      });
    }

    const donationId = parseInt(donation_id, 10);
    if (isNaN(donationId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid donation_id' } });
    }

    if (req.user.role === 'donor') {
      const isOwner = await withContext(req.user, async (client) => {
        const check = await client.query(
          `SELECT 1 FROM donation d JOIN donor dn ON dn.donor_id = d.donor_id WHERE d.donation_id = $1 AND dn.user_id = $2`,
          [donationId, req.user.user_id]
        );
        return check.rows.length > 0;
      });

      if (!isOwner) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view screening results for your own donations' } });
      }
    }

    const rows = await withContext(req.user, async (client) => {
      const q = `
        SELECT s.screening_id, s.donation_id, s.test_type, s.result, s.report,
               s.tested_at, u.full_name AS tested_by_name
          FROM screening_result s
          LEFT JOIN app_user u ON u.user_id = s.tested_by
         WHERE s.donation_id = $1
         ORDER BY s.test_type
      `;
      const resQuery = await client.query(q, [donationId]);
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
