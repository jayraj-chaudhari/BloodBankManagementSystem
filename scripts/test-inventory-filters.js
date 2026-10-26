async function run() {
  console.log('=== Testing Inventory & Cold Chain Filters ===\n');

  // Authenticate as Officer
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@bb.test', password: 'Test@1234' })
  });
  const token = (await loginRes.json()).data.token;
  console.log('[PASS] Officer authenticated.');

  // 1. All Units
  let resAll = await fetch('http://localhost:3000/api/v1/units?limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  console.log(`[PASS] Total units loaded: ${resAll.meta.total} (returned: ${resAll.data.length})`);

  // 2. Region Filter: RAJ
  let resRaj = await fetch('http://localhost:3000/api/v1/units?region_code=RAJ&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonRaj = resRaj.data.filter(u => u.region_code !== 'RAJ');
  console.log(`[PASS] RAJ Region Filter: ${resRaj.data.length} units (Non-RAJ: ${nonRaj.length})`);
  if (nonRaj.length > 0) throw new Error('Non-RAJ units leaked!');

  // 3. Region Filter: SUR
  let resSur = await fetch('http://localhost:3000/api/v1/units?region_code=SUR&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonSur = resSur.data.filter(u => u.region_code !== 'SUR');
  console.log(`[PASS] SUR Region Filter: ${resSur.data.length} units (Non-SUR: ${nonSur.length})`);
  if (nonSur.length > 0) throw new Error('Non-SUR units leaked!');

  // 4. Status Filter: AVAILABLE
  let resAvail = await fetch('http://localhost:3000/api/v1/units?status=AVAILABLE&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonAvail = resAvail.data.filter(u => u.status !== 'AVAILABLE');
  console.log(`[PASS] AVAILABLE Status Filter: ${resAvail.data.length} units (Non-AVAILABLE: ${nonAvail.length})`);
  if (nonAvail.length > 0) throw new Error('Non-AVAILABLE units leaked!');

  // 5. Blood Group Filter: O+
  let resOpos = await fetch('http://localhost:3000/api/v1/units?blood_group=O%2B&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonOpos = resOpos.data.filter(u => u.blood_group !== 'O+');
  console.log(`[PASS] Blood Group O+ Filter: ${resOpos.data.length} units (Non-O+: ${nonOpos.length})`);
  if (nonOpos.length > 0) throw new Error('Non-O+ units leaked!');

  // 6. Component Filter: RED_CELLS
  let resRC = await fetch('http://localhost:3000/api/v1/units?component=RED_CELLS&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonRC = resRC.data.filter(u => u.component !== 'RED_CELLS');
  console.log(`[PASS] Component RED_CELLS Filter: ${resRC.data.length} units (Non-RED_CELLS: ${nonRC.length})`);
  if (nonRC.length > 0) throw new Error('Non-RED_CELLS units leaked!');

  // 7. Multi-filter: RAJ + AVAILABLE + RED_CELLS + O+
  let resCombo = await fetch('http://localhost:3000/api/v1/units?region_code=RAJ&status=AVAILABLE&component=RED_CELLS&blood_group=O%2B&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonCombo = resCombo.data.filter(u => u.region_code !== 'RAJ' || u.status !== 'AVAILABLE' || u.component !== 'RED_CELLS' || u.blood_group !== 'O+');
  console.log(`[PASS] Combined Filter (RAJ + AVAILABLE + RED_CELLS + O+): ${resCombo.data.length} units (Mismatched: ${nonCombo.length})`);
  if (nonCombo.length > 0) throw new Error('Combined filter mismatch!');

  // 8. Partitioned Ledger Filter: RAJ
  let resLedgerRaj = await fetch('http://localhost:3000/api/v1/inventory/ledger?region_code=RAJ&limit=100', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  let nonLedgerRaj = resLedgerRaj.data.filter(row => row.region_code !== 'RAJ');
  console.log(`[PASS] Stock Movement Ledger RAJ Filter: ${resLedgerRaj.data.length} events (Non-RAJ: ${nonLedgerRaj.length})`);
  if (nonLedgerRaj.length > 0) throw new Error('Non-RAJ ledger rows leaked!');

  console.log('\n=== ALL INVENTORY & COLD CHAIN TESTS PASSED! ===');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
