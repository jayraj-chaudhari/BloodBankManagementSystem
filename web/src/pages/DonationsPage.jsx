import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, CheckCircle2, AlertTriangle, Calendar, Droplets } from 'lucide-react';
import { donationApi } from '../services/api';
import Modal from '../components/common/Modal';

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [form, setForm] = useState({
    donor_id: '',
    branch_id: 1,
    donated_at: new Date().toISOString(),
    volume_ml: 350,
    hemoglobin_gdl: 13.5,
    components: ['RED_CELLS', 'PLASMA']
  });

  const loadDonations = async () => {
    try {
      setLoading(true);
      const res = await donationApi.getDonations();
      setDonations(res.data || []);
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await donationApi.createDonation({
        donor_id: Number(form.donor_id),
        branch_id: Number(form.branch_id),
        donated_at: form.donated_at,
        volume_ml: Number(form.volume_ml),
        hemoglobin_gdl: Number(form.hemoglobin_gdl),
        components: form.components
      });

      setSuccessMsg(`Donation #${res.data.donation_id} recorded! Created ${res.data.units.length} component bag(s).`);
      setShowModal(false);
      loadDonations();
    } catch (err) {
      setErrorMsg(err.message || 'Donation creation rejected by database business trigger');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            Blood Donation Events
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Enforces PostgreSQL gap check triggers (90 days male, 120 days female) & automatic component breakdown
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '13px'
          }}
        >
          <Plus size={16} />
          Record Donation
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '14px 20px', borderRadius: 'var(--radius-md)', backgroundColor: '#e8f5ec', color: 'var(--success)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600' }}>
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '14px 20px', borderRadius: 'var(--radius-md)', backgroundColor: '#fbebee', color: 'var(--danger)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600' }}>
          <AlertTriangle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Donations Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Donation ID</th>
              <th style={{ padding: '12px 16px' }}>Donor Details</th>
              <th style={{ padding: '12px 16px' }}>Blood Group</th>
              <th style={{ padding: '12px 16px' }}>Branch</th>
              <th style={{ padding: '12px 16px' }}>Volume</th>
              <th style={{ padding: '12px 16px' }}>Hemoglobin</th>
              <th style={{ padding: '12px 16px' }}>Collection Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading donations...</td></tr>
            ) : donations.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No donations recorded yet</td></tr>
            ) : (
              donations.map((don) => (
                <tr key={don.donation_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)' }}>
                    #{don.donation_id}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600' }}>{don.donor_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Donor #{don.donor_id}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f0f3fe', color: 'var(--primary)' }}>
                      {don.blood_group}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: '500' }}>
                    {don.branch_name}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700' }}>
                    {don.volume_ml} mL
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                    {don.hemoglobin_gdl} g/dL
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(don.donated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Donation Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Blood Donation Intake">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Donor ID *</label>
            <input
              type="number"
              required
              placeholder="e.g. 1"
              value={form.donor_id}
              onChange={(e) => setForm({ ...form, donor_id: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Branch ID *</label>
              <input
                type="number"
                required
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Volume (200 - 500 mL) *</label>
              <input
                type="number"
                min="200"
                max="500"
                required
                value={form.volume_ml}
                onChange={(e) => setForm({ ...form, volume_ml: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Hemoglobin (g/dL &gt;= 12.5) *</label>
              <input
                type="number"
                step="0.1"
                min="12.5"
                required
                value={form.hemoglobin_gdl}
                onChange={(e) => setForm({ ...form, hemoglobin_gdl: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Donation Timestamp</label>
              <input
                type="datetime-local"
                value={form.donated_at.slice(0, 16)}
                onChange={(e) => setForm({ ...form, donated_at: new Date(e.target.value).toISOString() })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Produce Components</label>
            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '13px' }}>
              {['RED_CELLS', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'].map((comp) => (
                <label key={comp} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={form.components.includes(comp)}
                    onChange={(e) => {
                      if (e.target.checked) setForm({ ...form, components: [...form.components, comp] });
                      else setForm({ ...form, components: form.components.filter(c => c !== comp) });
                    }}
                  />
                  {comp.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              marginTop: '10px'
            }}
          >
            Submit Donation to PostgreSQL
          </button>
        </form>
      </Modal>
    </div>
  );
}
