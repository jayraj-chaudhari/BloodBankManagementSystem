const { pool } = require('../api/src/db/pg');

async function runTests() {
  console.log('=== Starting E2E Verification & Filter Testing ===\n');

  // 1. Authenticate as Admin
  const adminLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bb.test', password: 'Test@1234' })
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.data.token;
  console.log('[PASS] Admin login authenticated.');

  // 2. Register a new hospital as unverified
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const hospName = `City Care Hospital ${randomSuffix}`;
  const regHospRes = await fetch('http://localhost:3000/api/v1/hospitals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      hospital_name: hospName,
      region_code: 'SUR',
      phone: '9876500001',
      latitude: 21.1702,
      longitude: 72.8311,
      is_verified: false
    })
  });
  const regHospData = await regHospRes.json();
  const hospId = regHospData.data.hospital_id;
  console.log(`[PASS] Registered unverified hospital: #${hospId} "${regHospData.data.hospital_name}" (is_verified: ${regHospData.data.is_verified})`);

  if (regHospData.data.is_verified !== false) {
    throw new Error('Expected initial is_verified to be false');
  }

  // 3. Verify the hospital using PATCH /api/v1/hospitals/:id/verify
  const verifyRes = await fetch(`http://localhost:3000/api/v1/hospitals/${hospId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ is_verified: true })
  });
  const verifyData = await verifyRes.json();
  console.log(`[PASS] Verified hospital #${hospId}: is_verified is now ${verifyData.data.is_verified}`);

  if (verifyData.data.is_verified !== true) {
    throw new Error('Expected is_verified to be true after PATCH verify');
  }

  // 4. Test revocation toggle
  const revokeRes = await fetch(`http://localhost:3000/api/v1/hospitals/${hospId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ is_verified: false })
  });
  const revokeData = await revokeRes.json();
  console.log(`[PASS] Revoked hospital #${hospId}: is_verified is now ${revokeData.data.is_verified}`);

  // Re-verify for presentation state
  await fetch(`http://localhost:3000/api/v1/hospitals/${hospId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ is_verified: true })
  });
  console.log(`[PASS] Re-verified hospital #${hospId} as active.`);

  // 5. Test Register with immediate verification flag
  const hosp2Name = `Metro Trauma Center ${randomSuffix}`;
  const regHosp2Res = await fetch('http://localhost:3000/api/v1/hospitals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      hospital_name: hosp2Name,
      region_code: 'RAJ',
      phone: '9876500002',
      latitude: 22.3039,
      longitude: 70.8022,
      is_verified: true
    })
  });
  const regHosp2Data = await regHosp2Res.json();
  console.log(`[PASS] Fast-track registered verified hospital: #${regHosp2Data.data.hospital_id} "${regHosp2Data.data.hospital_name}" (is_verified: ${regHosp2Data.data.is_verified})`);

  if (regHosp2Data.data.is_verified !== true) {
    throw new Error('Expected fast-track hospital to be verified immediately');
  }

  // 6. Test Donor Filters via Officer
  const officerLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@bb.test', password: 'Test@1234' })
  });
  const officerToken = (await officerLoginRes.json()).data.token;

  // Filter 6a: RAJ filter
  const rajDonorsRes = await fetch('http://localhost:3000/api/v1/donors?region_code=RAJ&limit=100', {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const rajDonors = (await rajDonorsRes.json()).data;
  const nonRaj = rajDonors.filter(d => d.region_code !== 'RAJ');
  console.log(`[PASS] RAJ Filter returned ${rajDonors.length} donors. Non-RAJ donors count: ${nonRaj.length}`);
  if (nonRaj.length > 0) throw new Error('Non-RAJ donors leaked into RAJ filter query!');

  // Filter 6b: Eligible Only filter
  const eligibleRes = await fetch('http://localhost:3000/api/v1/donors?eligible=true&limit=100', {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const eligibleDonors = (await eligibleRes.json()).data;
  const ineligible = eligibleDonors.filter(d => d.is_eligible !== true);
  console.log(`[PASS] Eligible Filter returned ${eligibleDonors.length} donors. Ineligible donors count: ${ineligible.length}`);
  if (ineligible.length > 0) throw new Error('Ineligible donors leaked into eligible=true filter query!');

  // Filter 6c: RAJ + Eligible filter
  const rajEligibleRes = await fetch('http://localhost:3000/api/v1/donors?region_code=RAJ&eligible=true&limit=100', {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const rajEligible = (await rajEligibleRes.json()).data;
  const badRajEligible = rajEligible.filter(d => d.region_code !== 'RAJ' || d.is_eligible !== true);
  console.log(`[PASS] RAJ + Eligible Filter returned ${rajEligible.length} donors. Mismatched: ${badRajEligible.length}`);
  if (badRajEligible.length > 0) throw new Error('Mismatched donor in RAJ + Eligible filter!');

  // Filter 6d: Blood Group + Region filter
  const bgRegionRes = await fetch('http://localhost:3000/api/v1/donors?blood_group=B%2B&region_code=VAD&limit=100', {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const bgRegionDonors = (await bgRegionRes.json()).data;
  const badBgRegion = bgRegionDonors.filter(d => d.blood_group !== 'B+' || d.region_code !== 'VAD');
  console.log(`[PASS] B+ & VAD Filter returned ${bgRegionDonors.length} donors. Mismatched: ${badBgRegion.length}`);
  if (badBgRegion.length > 0) throw new Error('Mismatched donor in B+ & VAD filter!');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests()
  .then(() => pool.end())
  .catch(err => {
    console.error('Test Failed:', err);
    pool.end();
    process.exit(1);
  });
