const { pool } = require('../db/pg');
const config = require('../config');

// Whitelisted role mapping as required by the specification contract
const ROLE_MAP = {
  admin: 'bb_admin',
  bb_officer: 'bb_officer',
  lab_tech: 'bb_lab_tech',
  hospital_user: 'bb_hospital',
  donor: 'bb_donor',
  auditor: 'bb_auditor'
};

/**
 * Context wrapper for executing database operations under PostgreSQL RLS & session variables.
 * @param {Object} user - Decoded JWT payload { user_id, role, clearance, branch_id, hospital_id, donor_id }
 * @param {Function} work - Async callback receiving the configured client
 * @param {Object} [options] - Options (e.g. { withEncKey: true } for routes touching contact PII)
 */
async function withContext(user, work, options = {}) {
  const dbRole = ROLE_MAP[user.role];
  if (!dbRole) {
    const error = new Error('Unknown role');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Set local database role for the duration of this transaction (DAC)
    await client.query(`SET LOCAL ROLE ${dbRole}`);

    // Set session parameters for Row-Level Security (MAC & Tenant Isolation)
    await client.query(
      `SELECT set_config('app.user_id', $1, true),
              set_config('app.role', $2, true),
              set_config('app.clearance', $3, true),
              set_config('app.branch_id', $4, true),
              set_config('app.hospital_id', $5, true),
              set_config('app.donor_id', $6, true)`,
      [
        user.user_id,
        user.role,
        user.clearance,
        user.branch_id ?? '',
        user.hospital_id ?? '',
        user.donor_id ?? ''
      ].map(String)
    );

    // If route requires contact decryption/encryption, provide session key
    if (options.withEncKey) {
      await client.query(
        `SELECT set_config('app.enc_key', $1, true)`,
        [config.ENC_KEY]
      );
    }

    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  ROLE_MAP,
  withContext
};
