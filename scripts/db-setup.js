const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Ordered list of SQL files based on database architect's structure
const SQL_FILES = [
  'db/00_init_as_superuser.sql',
  'db/schema/01_types.sql',
  'db/schema/02_tables.sql',
  'db/schema/02b_tables_clinical.sql',
  'db/schema/03_indexes.sql',
  'db/functions/20_functions.sql',
  'db/functions/21_triggers.sql',
  'db/functions/22_procedures.sql',
  'db/views/30_views.sql',
  'db/security/50_rolesgrant.sql',
  'db/security/51_rls.sql',
  'db/seed/60_lookups.sql'
];

async function runSetup() {
  console.log('--- Blood Bank Database Setup Starting ---');

  const superuserUrl = process.env.PG_SUPERUSER_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
  const ownerUrl = process.env.DB_OWNER_URL || 'postgres://bb_owner:owner_pw@localhost:5432/bloodbank';

  // Step 1: Run 00_init_as_superuser.sql as superuser
  console.log(`Connecting as superuser to initialize cluster roles and database...`);
  const superClient = new Client({ connectionString: superuserUrl });
  try {
    await superClient.connect();
    const initFile = path.resolve('db/00_init_as_superuser.sql');
    if (fs.existsSync(initFile)) {
      let initSql = fs.readFileSync(initFile, 'utf8');
      // Clean psql meta commands (\set, \connect, etc.)
      initSql = initSql.replace(/\\\w+.*$/gm, '-- $&');
      await superClient.query(initSql);
      console.log('✓ Successfully initialized database and cluster roles');
    }
  } catch (err) {
    console.warn(`[Superuser Step Notice]: ${err.message}`);
  } finally {
    await superClient.end();
  }

  // Step 2: Run subsequent scripts as bb_owner on the 'bloodbank' database
  console.log(`Connecting as bb_owner to build schema, functions, views, RLS, and lookups...`);
  const ownerClient = new Client({ connectionString: ownerUrl });
  try {
    await ownerClient.connect();

    for (const relPath of SQL_FILES.slice(1)) {
      const fullPath = path.resolve(relPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`File not found, skipping: ${relPath}`);
        continue;
      }

      console.log(`Executing ${relPath}...`);
      let sql = fs.readFileSync(fullPath, 'utf8');
      // Remove psql-specific meta commands (\set, \pset, etc.)
      sql = sql.replace(/\\\w+.*$/gm, '-- $&');

      await ownerClient.query(sql);
      console.log(`✓ ${path.basename(relPath)} applied successfully`);
    }

    console.log('--- Database Setup Completed Successfully ---');
  } catch (err) {
    console.error(`Database setup failed on bb_owner connection: ${err.message}`);
    process.exit(1);
  } finally {
    await ownerClient.end();
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = runSetup;
