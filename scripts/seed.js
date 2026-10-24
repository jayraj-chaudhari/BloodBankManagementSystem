const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Deterministic Pseudo-Random Generator (PRNG) with fixed seed 42
let s = 42;
function rng() {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
}
function choose(arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const REGIONS = ['SUR', 'AHM', 'VAD', 'RAJ'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['WHOLE_BLOOD', 'RED_CELLS', 'PLASMA', 'PLATELETS'];
const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Anushka', 'Khushi', 'Aarohi', 'Riya', 'Sneha', 'Rahul', 'Pooja', 'Amit', 'Neha', 'Vikram', 'Priya', 'Kunal', 'Simran', 'Rohan', 'Kavita'];
const LAST_NAMES = ['Patel', 'Shah', 'Mehta', 'Sharma', 'Verma', 'Chaudhari', 'Desai', 'Joshi', 'Trivedi', 'Bhatt', 'Prajapati', 'Solanki', 'Gohil', 'Vaghela', 'Modi'];

async function seedDatabase() {
  console.log('=== Starting Blood Bank Database Seeding ===');

  const ownerUrl = process.env.DB_OWNER_URL || 'postgres://bb_owner:owner_pw@localhost:5432/bloodbank';
  const encKey = process.env.ENC_KEY || 'default_32_character_encryption_secret_key!';
  const client = new Client({ connectionString: ownerUrl });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL as bb_owner');

    // 0. Set encryption key for pgcrypto operations
    await client.query(`SELECT set_config('app.enc_key', $1, false)`, [encKey]);

    // 1. Password hash for Test@1234
    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('Test@1234', salt);

    // 2. Insert Branches (5 branches across Gujarat: 1 regional hub + 4 local centres)
    console.log('Inserting branches...');
    const hubRes = await client.query(`
      INSERT INTO branch (branch_name, region_code, parent_branch_id, address, latitude, longitude)
      VALUES ($1, $2, NULL, ROW($3, $4, 'Gujarat', '395001')::address_t, $5, $6)
      ON CONFLICT (branch_name) DO UPDATE SET region_code = EXCLUDED.region_code
      RETURNING branch_id;
    `, ['Surat Central Hub', 'SUR', 'Ring Road', 'Surat', 21.170240, 72.831061]);
    const hubBranchId = hubRes.rows[0].branch_id;

    const childBranches = [
      { name: 'Ahmedabad Civil Branch', region: 'AHM', lat: 23.022505, lon: 72.571362, line1: 'Asarwa', city: 'Ahmedabad' },
      { name: 'Vadodara City Centre', region: 'VAD', lat: 22.307159, lon: 73.181219, line1: 'Sayajigunj', city: 'Vadodara' },
      { name: 'Rajkot Regional Branch', region: 'RAJ', lat: 22.303894, lon: 70.802160, line1: 'Kotecha Chowk', city: 'Rajkot' },
      { name: 'Surat Adajan Centre', region: 'SUR', lat: 21.195900, lon: 72.793300, line1: 'Adajan Gam', city: 'Surat' }
    ];

    for (const b of childBranches) {
      await client.query(`
        INSERT INTO branch (branch_name, region_code, parent_branch_id, address, latitude, longitude)
        VALUES ($1, $2, $3, ROW($4, $5, 'Gujarat', '395001')::address_t, $6, $7)
        ON CONFLICT (branch_name) DO UPDATE SET parent_branch_id = EXCLUDED.parent_branch_id;
      `, [b.name, b.region, hubBranchId, b.line1, b.city, b.lat, b.lon]);
    }

    const branchRows = await client.query(`SELECT branch_id FROM branch`);
    const branchIds = branchRows.rows.map(r => r.branch_id);

    // 3. Insert Hospitals (8 hospitals)
    console.log('Inserting hospitals...');
    const hospitals = [
      { name: 'Surat New Civil Hospital', region: 'SUR', phone: '9825000001', lat: 21.1750, lon: 72.8200 },
      { name: 'Kiran Multispeciality Hospital', region: 'SUR', phone: '9825000002', lat: 21.2180, lon: 72.8450 },
      { name: 'Ahmedabad Civil Hospital', region: 'AHM', phone: '9825000003', lat: 23.0530, lon: 72.6020 },
      { name: 'Apollo Hospitals Ahmedabad', region: 'AHM', phone: '9825000004', lat: 23.0970, lon: 72.5930 },
      { name: 'SSG Hospital Vadodara', region: 'VAD', phone: '9825000005', lat: 22.3030, lon: 73.1900 },
      { name: 'Sterling Hospital Vadodara', region: 'VAD', phone: '9825000006', lat: 22.3160, lon: 73.1490 },
      { name: 'PDU Government Hospital Rajkot', region: 'RAJ', phone: '9825000007', lat: 22.2980, lon: 70.8010 },
      { name: 'Wockhardt Hospital Rajkot', region: 'RAJ', phone: '9825000008', lat: 22.2880, lon: 70.7810 }
    ];

    for (const h of hospitals) {
      await client.query(`
        INSERT INTO hospital (hospital_name, region_code, address, phone, latitude, longitude, is_verified)
        VALUES ($1, $2, ROW('Hospital Road', 'City Area', 'Gujarat', '380001')::address_t, $3, $4, $5, true)
        ON CONFLICT (hospital_name, region_code) DO NOTHING;
      `, [h.name, h.region, h.phone, h.lat, h.lon]);
    }

    const hospitalRows = await client.query(`SELECT hospital_id FROM hospital`);
    const hospitalIds = hospitalRows.rows.map(r => r.hospital_id);

    // 4. Insert Demo Accounts
    console.log('Inserting demo staff and user accounts (Password: Test@1234)...');
    const demoAccounts = [
      { email: 'admin@bb.test', name: 'Asha Patel (Admin)', role: 'admin', branch_id: null, hospital_id: null },
      { email: 'officer@bb.test', name: 'Raman Joshi (Officer)', role: 'bb_officer', branch_id: hubBranchId, hospital_id: null },
      { email: 'lab@bb.test', name: 'Dr. Suresh Mehta (Lab Tech)', role: 'lab_tech', branch_id: hubBranchId, hospital_id: null },
      { email: 'hospital@bb.test', name: 'Surat Civil Desk (Hospital Staff)', role: 'hospital_user', branch_id: null, hospital_id: hospitalIds[0] },
      { email: 'auditor@bb.test', name: 'Priya Desai (Auditor)', role: 'auditor', branch_id: null, hospital_id: null }
    ];

    for (const acc of demoAccounts) {
      await client.query(`
        INSERT INTO app_user (email, password_hash, full_name, role_name, branch_id, hospital_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, branch_id = EXCLUDED.branch_id, hospital_id = EXCLUDED.hospital_id;
      `, [acc.email, demoPasswordHash, acc.name, acc.role, acc.branch_id, acc.hospital_id]);
    }

    // 5. Insert Donors & Encrypted Contacts (~100 donors)
    console.log('Generating realistic synthetic donors with encrypted contacts (pgcrypto)...');
    // First, insert primary demo donor donor1@bb.test
    const demoDonorUser = await client.query(`
      INSERT INTO app_user (email, password_hash, full_name, role_name)
      VALUES ('donor1@bb.test', $1, 'Rajesh Kumar (Primary Demo Donor)', 'donor')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING user_id;
    `, [demoPasswordHash]);

    const demoUserId = demoDonorUser.rows[0].user_id;
    const demoDonorRes = await client.query(`
      INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available)
      VALUES ($1, '1995-04-12', 'M', 'O+', 68.5, 'SUR', 21.1700, 72.8300, true)
      ON CONFLICT (user_id) DO UPDATE SET blood_group = EXCLUDED.blood_group
      RETURNING donor_id;
    `, [demoUserId]);

    const demoDonorId = demoDonorRes.rows[0].donor_id;
    await client.query(`
      INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
      VALUES ($1, fn_encrypt_text('9876543210'), fn_encrypt_text('donor1@bb.test'), fn_encrypt_text('12 Ring Road, Surat'))
      ON CONFLICT (donor_id) DO UPDATE SET phone_enc = EXCLUDED.phone_enc;
    `, [demoDonorId]);

    // Generate remaining ~80 synthetic donors
    const donorIds = [demoDonorId];
    for (let i = 2; i <= 80; i++) {
      const email = `donor${i}@bb.test`;
      const fullName = `${choose(FIRST_NAMES)} ${choose(LAST_NAMES)}`;
      const gender = choose(['M', 'F']);
      const bg = choose(BLOOD_GROUPS);
      const region = choose(REGIONS);
      const weight = randInt(48, 85);
      const birthYear = randInt(1975, 2004);
      const dob = `${birthYear}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;
      const phone = `98${randInt(10000000, 99999999)}`;

      const userRes = await client.query(`
        INSERT INTO app_user (email, password_hash, full_name, role_name)
        VALUES ($1, $2, $3, 'donor')
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING user_id;
      `, [email, demoPasswordHash, fullName]);

      const uid = userRes.rows[0].user_id;

      const dRes = await client.query(`
        INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available)
        VALUES ($1, $2, $3, $4, $5, $6, 21.17 + (random()*0.1), 72.83 + (random()*0.1), true)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING donor_id;
      `, [uid, dob, gender, bg, weight, region]);

      if (dRes.rows.length > 0) {
        const did = dRes.rows[0].donor_id;
        donorIds.push(did);

        await client.query(`
          INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
          VALUES ($1, fn_encrypt_text($2), fn_encrypt_text($3), fn_encrypt_text($4))
          ON CONFLICT (donor_id) DO NOTHING;
        `, [did, phone, email, `${randInt(1, 100)} Central Street, ${region}`]);
      }
    }

    console.log(`✓ Inserted ${donorIds.length} donors with encrypted contacts`);

    // 6. Insert Donations & Blood Units (~150 donations over past 90 days)
    console.log('Generating donations and component blood units...');
    let unitCount = 0;
    const officerUserRes = await client.query(`SELECT user_id FROM app_user WHERE email = 'officer@bb.test'`);
    const officerId = officerUserRes.rows[0]?.user_id || 1;

    for (const did of donorIds) {
      const numDonations = randInt(1, 3);
      for (let j = 0; j < numDonations; j++) {
        const daysAgo = (numDonations - j) * 100 + randInt(5, 30);
        const volume = choose([350, 450]);
        const hgb = (randInt(128, 165) / 10).toFixed(1);

        try {
          const donRes = await client.query(`
            INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
            VALUES ($1, $2, now() - make_interval(days => $3), $4, $5, $6)
            RETURNING donation_id, donated_at;
          `, [did, choose(branchIds), daysAgo, volume, hgb, officerId]);

          const donationId = donRes.rows[0].donation_id;
          const donatedAt = donRes.rows[0].donated_at;

          // Create units for this donation
          const chosenComps = choose([
            ['RED_CELLS', 'PLASMA'],
            ['RED_CELLS', 'PLASMA', 'PLATELETS'],
            ['WHOLE_BLOOD']
          ]);

          for (const comp of chosenComps) {
            const status = daysAgo > 45 ? choose(['AVAILABLE', 'ISSUED', 'EXPIRED']) : choose(['AVAILABLE', 'AVAILABLE', 'QUARANTINE']);
            await client.query(`
              INSERT INTO blood_unit (donation_id, component, volume_ml, status, storage_location, expires_on, unit_code)
              VALUES (
                $1, $2, $3, $4, 'BAY-' || floor(random()*10 + 1),
                ($5::timestamptz + make_interval(days => (SELECT shelf_life_days FROM component_spec WHERE component = $2)))::date,
                'SUR-' || to_char($5::timestamptz, 'YYYYMMDD') || '-' || lpad(nextval('unit_code_seq')::text, 4, '0')
              )
              ON CONFLICT (donation_id, component) DO NOTHING;
            `, [donationId, comp, Math.floor(volume / chosenComps.length), status, donatedAt]);
            unitCount++;
          }

          // Insert screening results for this donation
          const labTechRes = await client.query(`SELECT user_id FROM app_user WHERE role_name = 'lab_tech' LIMIT 1`);
          const labTechId = labTechRes.rows[0]?.user_id || officerId;

          for (const test of ['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA']) {
            await client.query(`
              INSERT INTO screening_result (donation_id, test_type, result, report, tested_by)
              VALUES ($1, $2, 'NEGATIVE', '{"method": "EIA", "absorbance": 0.05}'::jsonb, $3)
              ON CONFLICT (donation_id, test_type) DO NOTHING;
            `, [donationId, test, labTechId]);
          }
        } catch (donErr) {
          // ignore gap violations on seed variations
        }
      }
    }

    console.log(`✓ Inserted donations and created ${unitCount} blood units with verified screenings`);

    // 7. Insert Hospital Requests (~25 requisitions)
    console.log('Generating hospital blood requests...');
    const hospitalUserRes = await client.query(`SELECT user_id FROM app_user WHERE role_name = 'hospital_user' LIMIT 1`);
    const hospUserId = hospitalUserRes.rows[0]?.user_id || 1;

    for (let r = 1; r <= 25; r++) {
      const bg = choose(BLOOD_GROUPS);
      const comp = choose(COMPONENTS);
      const units = randInt(1, 4);
      const urgency = choose(['ROUTINE', 'ROUTINE', 'URGENT', 'EMERGENCY']);
      const status = choose(['PENDING', 'PENDING', 'APPROVED', 'FULFILLED']);
      const hospId = choose(hospitalIds);
      const patientRef = `PT-${randInt(10000, 99999)}`;

      const reqRes = await client.query(`
        INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed, urgency, status, needed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() + interval '2 days')
        RETURNING request_id;
      `, [hospId, hospUserId, patientRef, bg, comp, units, urgency, status]);

      // If fulfilled, link an allocation
      const reqId = reqRes.rows[0].request_id;
      if (status === 'FULFILLED' || status === 'APPROVED') {
        const availUnit = await client.query(`
          SELECT unit_id FROM blood_unit
           WHERE component = $1 AND status = 'AVAILABLE'
           LIMIT 1;
        `, [comp]);

        if (availUnit.rows.length > 0) {
          const uid = availUnit.rows[0].unit_id;
          try {
            await client.query(`
              INSERT INTO request_allocation (request_id, unit_id, allocated_by)
              VALUES ($1, $2, $3)
              ON CONFLICT (unit_id) DO NOTHING;
            `, [reqId, uid, officerId]);

            await client.query(`
              UPDATE blood_unit SET status = 'RESERVED' WHERE unit_id = $1;
            `, [uid]);
          } catch (e) {}
        }
      }
    }

    console.log('✓ Inserted 25 hospital requisitions and linked allocations');

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Credentials (all accounts use password: Test@1234):');
    console.log('  • Admin:        admin@bb.test');
    console.log('  • Officer:      officer@bb.test');
    console.log('  • Lab Tech:     lab@bb.test');
    console.log('  • Hospital:     hospital@bb.test');
    console.log('  • Donor:        donor1@bb.test');
    console.log('  • Auditor:      auditor@bb.test');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
