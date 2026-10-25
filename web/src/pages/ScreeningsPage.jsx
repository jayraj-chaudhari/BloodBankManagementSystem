import React, { useState, useEffect } from 'react';
import { Microscope, CheckCircle2, XCircle, AlertCircle, Plus, ShieldCheck, Lock } from 'lucide-react';
import { screeningApi, donationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

export default function ScreeningsPage() {
  const { user } = useAuth();
  const role = user?.role || user?.role_name;
  const isLabTech = role === 'lab_tech';
  const isDonor = role === 'donor';

  const [donationId, setDonationId] = useState('1');
  const [donorDonations, setDonorDonations] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    donation_id: '1',
    test_type: 'HIV',
    result: 'NEGATIVE',
    notes: 'Chemiluminescence assay passed'
  });

  const loadDonorDonations = async () => {
    try {
      const res = await donationApi.getDonationsMe();
      const list = res.data || [];
      setDonorDonations(list);
      if (list.length > 0) {
        setDonationId(String(list[0].donation_id));
        loadScreenings(list[0].donation_id);
      }
    } catch (err) {
      console.error('Failed to load donor donations:', err);
    }
  };

  const loadScreenings = async (id = donationId) => {
    if (!id) return;
    try {
      setLoading(true);
      setMessage(null);
      const res = await screeningApi.getScreenings(id);
      setScreenings(res.data || []);
    } catch (err) {
      console.error('Failed to load screenings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load screening tests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDonor) {
      loadDonorDonations();
    } else if (isLabTech) {
      loadScreenings(donationId);
    }
  }, [role]);

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    try {
      await screeningApi.createScreening({
        donation_id: Number(form.donation_id),
        test_type: form.test_type,
        result: form.result,
        report: { notes: form.notes, method: 'EIA_ELISA' }
      });

      setMessage({ type: 'success', text: `Recorded ${form.test_type} screening as ${form.result}!` });
      setShowModal(false);
      loadScreenings(form.donation_id);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Screening submission failed' });
    }
  };

  const tests = ['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA'];

  if (!isLabTech && !isDonor) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <div className="hope-card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
            MAC Level 3 Restricted Area
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
            Clinical screening results and infectious disease diagnostics are strictly partitioned under PostgreSQL Mandatory Access Control (MAC Level 3: RESTRICTED).
            Your active role (<strong>{role}</strong>, MAC Level {user?.clearance || 2}) cannot view or record infectious panel results.
          </p>
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fd',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-light)',
            display: 'inline-block',
            textAlign: 'left'
          }}>
            <div><strong>Authorized Role:</strong> Laboratory Specialist (`bb_lab_tech`)</div>
            <div><strong>Demo Account:</strong> Dr. Suresh Mehta (<code>lab@bb.test</code>)</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
              {isDonor ? 'My Laboratory Screening Reports' : 'Laboratory Screening Bench'}
            </h2>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#fbebee', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px' }}>
              RESTRICTED MAC LEVEL 3
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isDonor
              ? 'Infectious disease safety panel results for your donated blood units.'
              : 'Mandatory infectious screening. Passing all 5 tests transitions units from QUARANTINE to AVAILABLE.'}
          </p>
        </div>

        {isLabTech && (
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
            Record Lab Result
          </button>
        )}
      </div>

      {message && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: message.type === 'success' ? '#e8f5ec' : '#fbebee',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          {message.text}
        </div>
      )}

      {/* Query Bar */}
      <div className="hope-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        {isDonor ? (
          <>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Select Donation Event:</div>
            {donorDonations.length === 0 ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No donation records found.</span>
            ) : (
              <select
                value={donationId}
                onChange={(e) => {
                  setDonationId(e.target.value);
                  loadScreenings(e.target.value);
                }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                {donorDonations.map((d) => (
                  <option key={d.donation_id} value={d.donation_id}>
                    Donation #{d.donation_id} - {new Date(d.donated_at).toLocaleDateString()} ({d.volume_ml} mL)
                  </option>
                ))}
              </select>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Inspection by Donation ID:</div>
            <input
              type="number"
              value={donationId}
              onChange={(e) => setDonationId(e.target.value)}
              placeholder="Enter Donation ID"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', width: '180px' }}
            />
            <button
              onClick={() => loadScreenings(donationId)}
              style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#ffffff', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}
            >
              Search Screening Results
            </button>
          </>
        )}
      </div>

      {/* Test Status Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {tests.map((t) => {
          const recorded = screenings.find(s => s.test_type === t);
          const isPassed = recorded?.result === 'NEGATIVE';
          const isFailed = recorded?.result === 'POSITIVE';

          return (
            <div key={t} className="hope-card" style={{ padding: '18px', borderLeft: `4px solid ${isPassed ? 'var(--success)' : isFailed ? 'var(--danger)' : '#d1d5db'}` }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{t} TEST</div>
              <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: isPassed ? 'var(--success)' : isFailed ? 'var(--danger)' : 'var(--text-muted)' }}>
                {recorded ? recorded.result : 'PENDING'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {recorded ? new Date(recorded.tested_at).toLocaleDateString() : 'Awaiting Specimen'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screenings Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Test Type</th>
              <th style={{ padding: '12px 16px' }}>Donation ID</th>
              <th style={{ padding: '12px 16px' }}>Result</th>
              <th style={{ padding: '12px 16px' }}>Technician</th>
              <th style={{ padding: '12px 16px' }}>Tested At</th>
              <th style={{ padding: '12px 16px' }}>Methodology / Report</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading test records...</td></tr>
            ) : screenings.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No test results recorded for this donation yet</td></tr>
            ) : (
              screenings.map((sc) => (
                <tr key={sc.screening_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '800', color: 'var(--primary)' }}>
                    {sc.test_type}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                    Donation #{sc.donation_id}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      backgroundColor: sc.result === 'NEGATIVE' ? '#e8f5ec' : '#fbebee',
                      color: sc.result === 'NEGATIVE' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {sc.result}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                    {sc.tested_by_name || 'Lab Technician'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                    {new Date(sc.tested_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {JSON.stringify(sc.report)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Screening Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Infectious Disease Screening Result">
        <form onSubmit={handleTestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Donation ID *</label>
            <input
              type="number"
              required
              value={form.donation_id}
              onChange={(e) => setForm({ ...form, donation_id: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Test Type *</label>
              <select
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                {tests.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Result *</label>
              <select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="NEGATIVE">NEGATIVE (Safe)</option>
                <option value="POSITIVE">POSITIVE (Discard)</option>
                <option value="INCONCLUSIVE">INCONCLUSIVE (Retest)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Lab Report Notes (JSONB)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
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
            Submit Screening Result
          </button>
        </form>
      </Modal>
    </div>
  );
}
