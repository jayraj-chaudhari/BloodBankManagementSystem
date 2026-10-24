const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getAuditCollection } = require('../db/mongo');
const { verifyAuditChain } = require('../services/auditService');

// GET /api/v1/audit (auditor, admin) - Retrieve audit logs
router.get('/', authenticate, authorizeRoles('auditor', 'admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { action, user_id, resource } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (user_id) filter.user_id = parseInt(user_id, 10);
    if (resource) filter.resource = resource;

    const col = getAuditCollection();
    const total = await col.countDocuments(filter);
    const logs = await col.find(filter)
                          .sort({ seq: -1 })
                          .skip(skip)
                          .limit(limit)
                          .toArray();

    return res.status(200).json({
      data: logs,
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

// GET /api/v1/audit/verify (auditor, admin) - Cryptographic verification of the hash chain
router.get('/verify', authenticate, authorizeRoles('auditor', 'admin'), async (req, res, next) => {
  try {
    const result = await verifyAuditChain();

    if (!result.valid) {
      return res.status(409).json({
        error: {
          code: 'AUDIT_INTEGRITY_COMPROMISED',
          message: `Audit chain verification failed at sequence #${result.broken_seq}: ${result.reason}`
        },
        details: result
      });
    }

    return res.status(200).json({
      data: {
        verified: true,
        total_entries_verified: result.total_entries,
        latest_hash: result.latest_hash,
        status: 'Audit trail hash chain intact and mathematically verified'
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit/anomalies (auditor, admin) - P1 Anomaly detection
router.get('/anomalies', authenticate, authorizeRoles('auditor', 'admin'), async (req, res, next) => {
  try {
    const col = getAuditCollection();

    // 1. IP addresses with multiple failed logins
    const failedLogins = await col.aggregate([
      { $match: { action: 'LOGIN_FAILED' } },
      { $group: { _id: '$ip', count: { $sum: 1 }, users_attempted: { $addToSet: '$details.email' } } },
      { $match: { count: { $gte: 3 } } }
    ]).toArray();

    // 2. High volume of PII views
    const highPiiViews = await col.aggregate([
      { $match: { action: 'PII_VIEWED' } },
      { $group: { _id: '$user_id', count: { $sum: 1 }, last_view: { $max: '$ts' } } },
      { $match: { count: { $gte: 10 } } }
    ]).toArray();

    return res.status(200).json({
      data: {
        suspicious_login_attempts: failedLogins,
        high_frequency_pii_access: highPiiViews
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
