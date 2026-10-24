const runSetup = require('./db-setup');

async function runReset() {
  console.log('--- Resetting Blood Bank Database ---');
  await runSetup();
  console.log('Database reset and ready for seeding.');
}

if (require.main === module) {
  runReset();
}

module.exports = runReset;
