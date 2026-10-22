const express = require('express');
const router = express.Router();
const { pool } = require('../db/pg');
const { getDb } = require('../db/mongo');

router.get('/health', async (req, res) => {
  let pgStatus = 'down';
  let mongoStatus = 'down';

  try {
    const resPg = await pool.query('SELECT 1 AS ok');
    if (resPg.rows[0]?.ok === 1) pgStatus = 'up';
  } catch (e) {
    pgStatus = `error: ${e.message}`;
  }

  try {
    const db = getDb();
    if (db) {
      await db.command({ ping: 1 });
      mongoStatus = 'up';
    }
  } catch (e) {
    mongoStatus = `error: ${e.message}`;
  }

  const isHealthy = pgStatus === 'up' && mongoStatus === 'up';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    services: {
      api: 'up',
      postgres: pgStatus,
      mongodb: mongoStatus
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
