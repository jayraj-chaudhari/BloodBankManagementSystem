const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { withContext } = require('../middleware/withContext');

// Utility to escape XML special characters
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// GET /api/v1/export/requests/:request_id.xml (officer only)
router.get('/requests/:request_id.xml', authenticate, authorizeRoles('bb_officer', 'admin'), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.request_id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request_id' } });
    }

    const data = await withContext(req.user, async (client) => {
      const reqRes = await client.query(`
        SELECT r.request_id, r.patient_ref, r.blood_group, r.component,
               r.units_needed, r.urgency, r.status, r.needed_by, r.created_at,
               h.hospital_name, h.region_code
          FROM blood_request r
          JOIN hospital h ON h.hospital_id = r.hospital_id
         WHERE r.request_id = $1
      `, [requestId]);

      if (reqRes.rows.length === 0) return null;
      const request = reqRes.rows[0];

      const allocRes = await client.query(`
        SELECT ra.allocation_id, ra.allocated_at, u.unit_code, u.component, u.expires_on
          FROM request_allocation ra
          JOIN blood_unit u ON u.unit_id = ra.unit_id
         WHERE ra.request_id = $1
      `, [requestId]);

      request.allocations = allocRes.rows;
      return request;
    });

    if (!data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<BloodRequest id="${escapeXml(data.request_id)}">\n`;
    xml += `  <PatientRef>${escapeXml(data.patient_ref)}</PatientRef>\n`;
    xml += `  <Hospital name="${escapeXml(data.hospital_name)}" region="${escapeXml(data.region_code)}" />\n`;
    xml += `  <Requirement bloodGroup="${escapeXml(data.blood_group)}" component="${escapeXml(data.component)}" units="${escapeXml(data.units_needed)}" urgency="${escapeXml(data.urgency)}" />\n`;
    xml += `  <Status>${escapeXml(data.status)}</Status>\n`;
    xml += `  <NeededBy>${escapeXml(data.needed_by)}</NeededBy>\n`;
    xml += `  <CreatedAt>${escapeXml(data.created_at)}</CreatedAt>\n`;
    xml += `  <Allocations count="${data.allocations.length}">\n`;
    for (const alloc of data.allocations) {
      xml += `    <Unit code="${escapeXml(alloc.unit_code)}" component="${escapeXml(alloc.component)}" expiresOn="${escapeXml(alloc.expires_on)}" allocatedAt="${escapeXml(alloc.allocated_at)}" />\n`;
    }
    xml += `  </Allocations>\n`;
    xml += `</BloodRequest>\n`;

    res.set('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/export/donations/:donation_id.xml (officer only)
router.get('/donations/:donation_id.xml', authenticate, authorizeRoles('bb_officer', 'admin'), async (req, res, next) => {
  try {
    const donationId = parseInt(req.params.donation_id, 10);
    if (isNaN(donationId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid donation_id' } });
    }

    const data = await withContext(req.user, async (client) => {
      const donRes = await client.query(`
        SELECT d.donation_id, d.donor_id, d.donated_at, d.volume_ml, d.hemoglobin_gdl,
               b.branch_name, b.region_code, dn.blood_group
          FROM donation d
          JOIN branch b ON b.branch_id = d.branch_id
          JOIN donor dn ON dn.donor_id = d.donor_id
         WHERE d.donation_id = $1
      `, [donationId]);

      if (donRes.rows.length === 0) return null;
      const donation = donRes.rows[0];

      const unitRes = await client.query(`
        SELECT unit_id, unit_code, component, volume_ml, status, expires_on
          FROM blood_unit
         WHERE donation_id = $1
      `, [donationId]);

      donation.units = unitRes.rows;
      return donation;
    });

    if (!data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Donation not found' } });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<Donation id="${escapeXml(data.donation_id)}">\n`;
    xml += `  <Donor id="${escapeXml(data.donor_id)}" bloodGroup="${escapeXml(data.blood_group)}" />\n`;
    xml += `  <Collection branch="${escapeXml(data.branch_name)}" region="${escapeXml(data.region_code)}" donatedAt="${escapeXml(data.donated_at)}" volumeMl="${escapeXml(data.volume_ml)}" hemoglobin="${escapeXml(data.hemoglobin_gdl)}" />\n`;
    xml += `  <Units count="${data.units.length}">\n`;
    for (const unit of data.units) {
      xml += `    <Unit code="${escapeXml(unit.unit_code)}" component="${escapeXml(unit.component)}" volumeMl="${escapeXml(unit.volume_ml)}" status="${escapeXml(unit.status)}" expiresOn="${escapeXml(unit.expires_on)}" />\n`;
    }
    xml += `  </Units>\n`;
    xml += `</Donation>\n`;

    res.set('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
