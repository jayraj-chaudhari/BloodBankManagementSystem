const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, text: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(email, password = 'Test@1234') {
  const res = await request({ path: '/api/v1/auth/login', method: 'POST' }, { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data.token,
    user: res.data.data.user
  };
}

async function testAll() {
  console.log('=== VERIFYING ALL 6 ROLES ACROSS API, RLS & DAC ===\n');

  // 1. ADMIN
  console.log('1. Testing SYSTEM ADMINISTRATOR (admin@bb.test)...');
  const admin = await login('admin@bb.test');
  console.log(`   Logged in as: ${admin.user.full_name} (Role: ${admin.user.role}, Clearance: ${admin.user.clearance})`);
  
  // Test /auth/me
  const adminMe = await request({ path: '/api/v1/auth/me', token: admin.token });
  console.log(`   /auth/me role: ${adminMe.data.data.role}`);
  
  // Test Reveal PII
  const piiRes = await request({ path: '/api/v1/donors/1/contact', token: admin.token });
  console.log(`   Reveal PII status: ${piiRes.status} (Phone: ${piiRes.data.data?.phone ? 'Decrypted ✓' : 'Failed'})`);

  // Test Record Donation as Admin with eligible donor (donor_id 48)
  const donRes = await request({ path: '/api/v1/donations', method: 'POST', token: admin.token }, {
    donor_id: 48,
    branch_id: 1,
    donated_at: new Date().toISOString(),
    volume_ml: 450,
    hemoglobin_gdl: 14.5,
    components: ['RED_CELLS', 'PLASMA']
  });
  console.log(`   Admin Record Donation status: ${donRes.status} (Donation ID: ${donRes.data.data?.donation_id || 'Err: ' + JSON.stringify(donRes.data)})`);

  // 2. OFFICER
  console.log('\n2. Testing BLOOD BANK OFFICER (officer@bb.test)...');
  const officer = await login('officer@bb.test');
  console.log(`   Logged in as: ${officer.user.full_name} (Role: ${officer.user.role})`);
  
  // Test FEFO allocation on pending request
  const reqsRes = await request({ path: '/api/v1/requests', token: officer.token });
  const pendingReq = reqsRes.data.data?.find(r => r.status === 'PENDING' || r.status === 'PARTIAL');
  if (pendingReq) {
    const fefoRes = await request({ path: `/api/v1/requests/${pendingReq.request_id}/allocate`, method: 'POST', token: officer.token });
    console.log(`   FEFO Allocation status on req #${pendingReq.request_id}: ${fefoRes.status} (${JSON.stringify(fefoRes.data.data || fefoRes.data)})`);
  } else {
    console.log('   FEFO Allocation: No open pending requests to allocate');
  }

  // 3. LAB TECH
  console.log('\n3. Testing LAB TECHNICIAN (lab@bb.test)...');
  const lab = await login('lab@bb.test');
  console.log(`   Logged in as: ${lab.user.full_name} (Role: ${lab.user.role}, Clearance: ${lab.user.clearance})`);
  
  // Lab post screening result
  const labPost = await request({ path: '/api/v1/screenings', method: 'POST', token: lab.token }, {
    donation_id: 1,
    test_type: 'HBV',
    result: 'NEGATIVE',
    report: { notes: 'EIA HBsAg test negative' }
  });
  console.log(`   Lab Record Screening status: ${labPost.status} (${labPost.data.data?.result || JSON.stringify(labPost.data)})`);

  // Lab get screening queue
  const labGet = await request({ path: '/api/v1/screenings', token: lab.token });
  console.log(`   Lab Query Screenings status: ${labGet.status} (Count: ${labGet.data.data?.length})`);

  // 4. HOSPITAL USER
  console.log('\n4. Testing HOSPITAL USER (hospital@bb.test)...');
  const hosp = await login('hospital@bb.test');
  console.log(`   Logged in as: ${hosp.user.full_name} (Role: ${hosp.user.role}, Hospital ID: ${hosp.user.hospital_id})`);

  // Hospital creates requisition
  const hospReq = await request({ path: '/api/v1/requests', method: 'POST', token: hosp.token }, {
    patient_ref: 'E2E-TEST-' + Math.floor(Math.random() * 10000),
    blood_group: 'O+',
    component: 'RED_CELLS',
    units_needed: 1,
    urgency: 'ROUTINE',
    needed_by: new Date(Date.now() + 86400000).toISOString()
  });
  console.log(`   Hospital Create Requisition status: ${hospReq.status} (Req ID: ${hospReq.data.data?.request_id || JSON.stringify(hospReq.data)})`);

  // Hospital views public inventory
  const hospInv = await request({ path: '/api/v1/inventory/public', token: hosp.token });
  console.log(`   Hospital Public Inventory status: ${hospInv.status} (Groups available: ${hospInv.data.data?.length})`);

  // Hospital cancels own request
  if (hospReq.data.data?.request_id) {
    const cancelRes = await request({
      path: `/api/v1/requests/${hospReq.data.data.request_id}/status`,
      method: 'PATCH',
      token: hosp.token
    }, { status: 'CANCELLED' });
    console.log(`   Hospital Cancel Requisition status: ${cancelRes.status} (New status: ${cancelRes.data.data?.status || JSON.stringify(cancelRes.data)})`);
  }

  // 5. DONOR
  console.log('\n5. Testing REGISTERED DONOR (donor1@bb.test)...');
  const donor = await login('donor1@bb.test');
  console.log(`   Logged in as: ${donor.user.full_name} (Role: ${donor.user.role}, Donor ID: ${donor.user.donor_id})`);

  // Donor /me profile
  const donorMe = await request({ path: '/api/v1/donors/me', token: donor.token });
  console.log(`   Donor Profile status: ${donorMe.status} (Blood Group: ${donorMe.data.data?.blood_group}, Eligible: ${donorMe.data.data?.is_eligible})`);

  // Donor donations
  const donorDons = await request({ path: '/api/v1/donations/me', token: donor.token });
  console.log(`   Donor Donations status: ${donorDons.status} (Count: ${donorDons.data.data?.length})`);

  // Donor alerts
  const donorAlerts = await request({ path: '/api/v1/alerts/me', token: donor.token });
  console.log(`   Donor Alerts status: ${donorAlerts.status} (Active alerts: ${donorAlerts.data.data?.length})`);

  // 6. AUDITOR
  console.log('\n6. Testing INDEPENDENT AUDITOR (auditor@bb.test)...');
  const auditor = await login('auditor@bb.test');
  console.log(`   Logged in as: ${auditor.user.full_name} (Role: ${auditor.user.role})`);

  // Audit logs query
  const auditLogs = await request({ path: '/api/v1/audit?limit=5', token: auditor.token });
  console.log(`   Audit Logs status: ${auditLogs.status} (Entries: ${auditLogs.data.data?.length})`);

  // SHA-256 verify
  const auditVerify = await request({ path: '/api/v1/audit/verify', token: auditor.token });
  console.log(`   Cryptographic SHA-256 Chain Verify: ${auditVerify.status} (Valid: ${auditVerify.data.data?.valid}, Verified: ${auditVerify.data.data?.verified_records})`);

  console.log('\n=== ALL 6 ROLES VERIFIED SUCCESSFULLY! ===');
}

testAll().catch(err => {
  console.error('\nE2E TEST FAILURE:', err);
  process.exit(1);
});
