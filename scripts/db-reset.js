const runSetup = require('./db-setup');
const seedDatabase = require('./seed');

async function runReset() {
  console.log('--- Resetting & Seeding Blood Bank Database ---');
  await runSetup();
  console.log('Applying deterministic test and demo seed data...');
  await seedDatabase();
  console.log('Database reset and seeded successfully.');
}

if (require.main === module) {
  runReset();
}

module.exports = runReset;
