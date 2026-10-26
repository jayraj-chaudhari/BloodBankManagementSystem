const { Client } = require('pg');
require('dotenv').config();

async function seedRichInventory() {
  console.log('=== Seeding Rich Blood Bank Inventory Across All Branches & Groups ===');

  const connectionString = process.env.DB_OWNER_URL || 'postgresql://bb_owner:owner_pw@localhost:5432/bloodbank';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL as bb_owner');

    const officerId = 2; // Raman Joshi
    const labTechId = 3; // Dr. Suresh Mehta

    // Fetch branches
    const branchRes = await client.query('SELECT branch_id, branch_name, region_code FROM branch ORDER BY branch_id');
    const branches = branchRes.rows;
    console.log(`Found ${branches.length} branches`);

    // Fetch eligible donors
    const eligibleRes = await client.query(`
      SELECT dn.donor_id, dn.blood_group, dn.region_code, dn.gender
        FROM v_donor_eligibility e
        JOIN donor dn ON dn.donor_id = e.donor_id
       WHERE e.is_eligible = true
       ORDER BY dn.blood_group, dn.donor_id
    `);
    const eligibleDonors = eligibleRes.rows;
    console.log(`Found ${eligibleDonors.length} eligible donors across all blood groups`);

    let donationsCreated = 0;
    let unitsCreated = 0;
    let availableUnitsCreated = 0;
    let quarantineUnitsCreated = 0;

    const componentCombos = [
      ['RED_CELLS', 'PLASMA'],
      ['RED_CELLS', 'PLATELETS'],
      ['WHOLE_BLOOD'],
      ['RED_CELLS', 'PLASMA', 'PLATELETS'],
      ['RED_CELLS', 'PLASMA']
    ];

    const storageLocations = ['RACK-A1', 'RACK-A2', 'RACK-B1', 'RACK-B2', 'RACK-C1', 'FREEZER-1', 'FREEZER-2', 'AGITATOR-1'];

    for (let i = 0; i < eligibleDonors.length; i++) {
      const donor = eligibleDonors[i];
      // Distribute across branches
      const branch = branches[i % branches.length];
      const combo = componentCombos[i % componentCombos.length];

      // Give 85% of donations dates between 2 and 12 days ago (screened & available)
      // Give 15% dates of 0 or 1 day ago (fresh quarantine queue for lab tech)
      const isFreshQuarantine = (i % 6 === 0);
      const daysAgo = isFreshQuarantine ? (i % 2) : (2 + (i % 10));

      const volume = combo.length === 1 ? 450 : (combo.length === 3 ? 450 : 350);
      const hgb = (13.5 + ((i % 25) / 10)).toFixed(1);

      try {
        const donRes = await client.query(`
          INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
          VALUES ($1, $2, now() - make_interval(days => $3), $4, $5, $6)
          RETURNING donation_id, donated_at;
        `, [donor.donor_id, branch.branch_id, daysAgo, volume, hgb, officerId]);

        const donationId = donRes.rows[0].donation_id;
        donationsCreated++;

        const unitVolume = Math.floor(volume / combo.length);

        for (const comp of combo) {
          const loc = comp === 'PLASMA' ? (i % 2 === 0 ? 'FREEZER-1' : 'FREEZER-2')
                    : comp === 'PLATELETS' ? 'AGITATOR-1'
                    : storageLocations[i % storageLocations.length];

          const unitRes = await client.query(`
            INSERT INTO blood_unit (donation_id, component, volume_ml, storage_location)
            VALUES ($1, $2, $3, $4)
            RETURNING unit_id, unit_code, component, expires_on, status;
          `, [donationId, comp, unitVolume, loc]);

          unitsCreated++;

          if (isFreshQuarantine) {
            quarantineUnitsCreated++;
          }
        }

        // Screenings
        if (!isFreshQuarantine) {
          // Fully screened -> Passing all 5 tests transitions units from QUARANTINE to AVAILABLE
          for (const testType of ['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA']) {
            await client.query(`
              INSERT INTO screening_result (donation_id, test_type, result, report, tested_by)
              VALUES ($1, $2, 'NEGATIVE', '{"method": "CHEMILUMINESCENCE_AUTOMATED", "absorbance": 0.04}'::jsonb, $3)
              ON CONFLICT (donation_id, test_type) DO UPDATE SET result = 'NEGATIVE';
            `, [donationId, testType, labTechId]);
          }
          availableUnitsCreated += combo.length;
        } else {
          // Only screen HIV or HBV partially, leaving other tests pending for Lab Tech bench demo
          const partialTests = i % 2 === 0 ? ['HIV', 'HBV'] : ['HIV'];
          for (const testType of partialTests) {
            await client.query(`
              INSERT INTO screening_result (donation_id, test_type, result, report, tested_by)
              VALUES ($1, $2, 'NEGATIVE', '{"method": "CHEMILUMINESCENCE_AUTOMATED"}'::jsonb, $3)
              ON CONFLICT (donation_id, test_type) DO NOTHING;
            `, [donationId, testType, labTechId]);
          }
        }
      } catch (err) {
        console.warn(`Could not seed donation for donor ${donor.donor_id}:`, err.message);
      }
    }

    console.log(`\n✓ Successfully created ${donationsCreated} fresh donations!`);
    console.log(`✓ Created ${unitsCreated} total blood units across all branches & groups.`);
    console.log(`  • Available unexpired units: ~${availableUnitsCreated}`);
    console.log(`  • Pending Quarantine units (for lab bench demo): ~${quarantineUnitsCreated}`);

    // Verify stock in v_inventory
    const invRes = await client.query(`
      SELECT blood_group, component, sum(units_available) as total_available, sum(units_quarantine) as total_quarantine
        FROM v_inventory
       GROUP BY blood_group, component
       ORDER BY blood_group, component;
    `);
    console.log('\n--- Verified Live Stock Summary by Blood Group & Component ---');
    console.table(invRes.rows);

    const branchSummary = await client.query(`
      SELECT branch_name, region_code, sum(units_available) as available_units, sum(units_quarantine) as quarantine_units
        FROM v_inventory
       GROUP BY branch_name, region_code
       ORDER BY branch_name;
    `);
    console.log('\n--- Verified Live Stock Summary by Branch ---');
    console.table(branchSummary.rows);

  } catch (err) {
    console.error('Failed to seed rich inventory:', err);
  } finally {
    await client.end();
  }
}

seedRichInventory();
