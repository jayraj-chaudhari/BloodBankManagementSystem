import React, { useState, useEffect } from 'react';
import { Users, Eye, EyeOff, ShieldAlert, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { donorApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';

export default function DonorsPage() {
  const toast = useToast();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Contact decrypt modal
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

  const loadDonors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (bloodGroupFilter) params.blood_group = bloodGroupFilter;
      if (regionFilter) params.region_code = regionFilter;
      if (eligibleOnly) params.eligible = 'true';

      const res = await donorApi.getDonors(params);
      setDonors(res.data || []);
    } catch (err) {
      console.error('Failed to load donors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodGroupFilter, regionFilter, eligibleOnly]);

  const handleRevealContact = async (donorId) => {
    try {
      setContactLoading(true);
      const res = await donorApi.getDonorContact(donorId);
      setSelectedContact(res.data);
    } catch (err) {
      toast.error(`Contact reveal failed: ${err.message}`);
    } finally {
      setContactLoading(false);
    }
  };

  const filtered = donors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            Donor Medical Registry
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Protected with PostgreSQL Column Encryption (pgcrypto) & Row-Level Security
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="hope-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', backgroundColor: '#f5f6fa', padding: '8px 14px', borderRadius: '8px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search donors by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13px' }}
          />
        </div>

        <select
          value={bloodGroupFilter}
          onChange={(e) => setBloodGroupFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
        >
          <option value="">All Blood Groups</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
        >
          <option value="">All Regions</option>
          <option value="SUR">Surat (SUR)</option>
          <option value="AHM">Ahmedabad (AHM)</option>
          <option value="VAD">Vadodara (VAD)</option>
          <option value="RAJ">Rajkot (RAJ)</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
          />
          Eligible to Donate Today (90d/120d gap)
        </label>
      </div>

      {/* Donors Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Donor ID</th>
              <th style={{ padding: '12px 16px' }}>Donor Name</th>
              <th style={{ padding: '12px 16px' }}>Blood Group</th>
              <th style={{ padding: '12px 16px' }}>Gender / Age</th>
              <th style={{ padding: '12px 16px' }}>Region</th>
              <th style={{ padding: '12px 16px' }}>Eligibility Status</th>
              <th style={{ padding: '12px 16px' }}>Next Eligible</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Confidential PII</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading donor registry...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No donors matching criteria</td></tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.donor_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)' }}>
                    #{d.donor_id}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                    {d.full_name}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f0f3fe', color: 'var(--primary)' }}>
                      {d.blood_group}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                    {d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : 'Other'} • {d.weight_kg}kg
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f5f6fa' }}>
                      {d.region_code}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {d.is_eligible !== false ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--success)', backgroundColor: '#e8f5ec', padding: '3px 8px', borderRadius: '12px' }}>
                        <CheckCircle2 size={12} /> Eligible
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--warning)', backgroundColor: '#fef0e8', padding: '3px 8px', borderRadius: '12px' }}>
                        <XCircle size={12} /> Wait Period
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {d.next_eligible_on ? new Date(d.next_eligible_on).toLocaleDateString() : 'Now Eligible'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRevealContact(d.donor_id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#f5f6fa',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <Eye size={13} color="var(--primary)" />
                      Reveal PII
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Decrypted Contact Modal */}
      <Modal isOpen={!!selectedContact} onClose={() => setSelectedContact(null)} title="Decrypted Donor Contact Information">
        {selectedContact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#e6f7f8',
              color: 'var(--secondary)',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} />
              <span>Decrypted using PostgreSQL pgcrypto session key (PII_VIEWED logged in MongoDB audit trail)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="hope-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>{selectedContact.phone}</div>
              </div>
              <div className="hope-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{selectedContact.email || 'N/A'}</div>
              </div>
            </div>

            <div className="hope-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Postal Address</div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>{selectedContact.address || 'Address not registered'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
