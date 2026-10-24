const { Pool, types } = require('pg');

// Contract requirement: pg returns NUMERIC and BIGINT as strings. Convert with Number() before JSON.
types.setTypeParser(1700, (val) => val === null ? null : Number(val));
types.setTypeParser(20, (val) => val === null ? null : (Number.isSafeInteger(Number(val)) ? Number(val) : val));
const config = require('../config');

// Pool for application API requests (connecting as bb_app)
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
