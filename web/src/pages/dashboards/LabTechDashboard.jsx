import React, { useState, useEffect } from 'react';
import {
  Microscope,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  ShieldCheck,
  TrendingUp,
  FileText
} from 'lucide-react';
import HeroBanner from '../../components/common/HeroBanner';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { screeningApi, unitApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LabTechDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [screenings, setScreenings] = useState([]);
  const [quarantineUnits, setQuarantineUnits] = useState([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New screening test form
  const [testForm, setTestForm] = useState({
    donation_id: 1,
    test_type: 'HIV',
    result: 'NEGATIVE',
    report: { notes: 'ELISA screen clear, optical density < cut-off' }
  });

  const loadLabData = async () => {
    try {
      setLoading(true);
      // 1. Fetch recent screening records (Classification 3 RESTRICTED - Lab Tech only)
      const scrRes = await screeningApi.getScreenings({ limit: 15 });
      setScreenings(scrRes.data || []);

      // 2. Fetch quarantine units waiting for testing
      const unitRes = await unitApi.getUnits({ status: 'QUARANTINE', limit: 15 });
      setQuarantineUnits(unitRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load laboratory queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabData();
  }, []);

  const handleRecordTest = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await screeningApi.createScreening({
        donation_id: Number(testForm.donation_id),
        test_type: testForm.test_type,
        result: testForm.result,
        report: testForm.report
      });
      toast.success(
        `Logged ${testForm.test_type} test result: ${testForm.result} for donation #${testForm.donation_id}`,
        'Screening Result Logged'
      );
      setShowTestModal(false);
      loadLabData();
    } catch (err) {
      toast.error(err.message || 'Failed to record test');
    } finally {
      setSubmitting(false);
    }
  };

  const positiveTestsCount = screenings.filter(s => s.result === 'POSITIVE').length;
  const negativeTestsCount = screenings.filter(s => s.result === 'NEGATIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Lab Banner */}
      <HeroBanner
        title="Laboratory Screening Bench"
        subtitle="Process 5 mandatory viral markers (HIV, HBV, HCV, Syphilis, Malaria). Units automatically release to AVAILABLE only when all five tests return NEGATIVE."
        badgeText="Classification Level 3: RESTRICTED Laboratory MAC Clearance"
        actions={[
          {
            label: 'Record Test Result',
            icon: Plus,
            variant: 'primary',
            onClick: () => setShowTestModal(true)
          }
        ]}
      />

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={Clock}
          label="Quarantine Queue"
          value={quarantineUnits.length}
          badgeText="Units In Processing"
          color="#f59e0b"
        />
        <StatCard
          icon={CheckCircle2}
          label="Negative (Passed)"
          value={negativeTestsCount}
          badgeText="Clear for Release"
          color="#10b981"
        />
        <StatCard
          icon={XCircle}
          label="Reactive / Positive"
          value={positiveTestsCount}
          badgeText="Auto-Discarded"
          color="#ef4444"
        />
        <StatCard
          icon={Microscope}
          label="Total Screened"
          value={screenings.length}
          badgeText="Audit Tracked"
          color="#3a57e8"
        />
      </div>

      {/* Main Grid: Screenings Log & Quarantine Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '24px' }}>
        {/* Screening Results Table */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Laboratory Testing Log
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Protected under PostgreSQL MAC Clearance L3
              </div>
            </div>
            <button
              onClick={() => setShowTestModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Enter Result
            </button>
          </div>

          {screenings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No laboratory results recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Test ID</th>
                    <th style={{ padding: '10px 8px' }}>Donation</th>
                    <th style={{ padding: '10px 8px' }}>Marker</th>
                    <th style={{ padding: '10px 8px' }}>Result</th>
                    <th style={{ padding: '10px 8px' }}>Tested At</th>
                  </tr>
                </thead>
                <tbody>
                  {screenings.map((s) => {
                    const isPos = s.result === 'POSITIVE';
                    return (
                      <tr key={s.screening_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '700' }}>#{s.screening_id}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--primary)', fontWeight: '700' }}>
                          Donation #{s.donation_id}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: '800', color: '#1e293b' }}>
                          {s.test_type}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: isPos ? '#fee2e2' : '#dcfce7',
                            color: isPos ? '#b91c1c' : '#15803d',
                            fontWeight: '800',
                            fontSize: '11px'
                          }}>
                            {s.result}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(s.tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quarantine Units Awaiting Tests */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Units Awaiting 5-Marker Screen
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Requires HIV, HBV, HCV, SYPHILIS, MALARIA negative results to release
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
            {quarantineUnits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
                All collected blood units have been tested or processed.
              </div>
            ) : (
              quarantineUnits.map((u) => (
                <div
                  key={u.unit_id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: '#92400e', fontSize: '13px' }}>
                        {u.unit_code}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
                        {u.component}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px' }}>
                      Donation #{u.donation_id} | Vol: {u.volume_ml} mL
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTestForm({ ...testForm, donation_id: u.donation_id });
                      setShowTestModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Test Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Screening Modal */}
      {showTestModal && (
        <Modal
          title="Record Screening Viral Marker Result"
          onClose={() => setShowTestModal(false)}
        >
          <form onSubmit={handleRecordTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                Donation ID
              </label>
              <input
                type="number"
                required
                value={testForm.donation_id}
                onChange={(e) => setTestForm({ ...testForm, donation_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Viral Marker Test Type
                </label>
                <select
                  value={testForm.test_type}
                  onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="HIV">HIV 1 & 2</option>
                  <option value="HBV">Hepatitis B (HBsAg)</option>
                  <option value="HCV">Hepatitis C (Anti-HCV)</option>
                  <option value="SYPHILIS">Syphilis (VDRL/RPR)</option>
                  <option value="MALARIA">Malaria Antigen</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Diagnostic Result
                </label>
                <select
                  value={testForm.result}
                  onChange={(e) => setTestForm({ ...testForm, result: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="NEGATIVE">NEGATIVE (Non-Reactive / Clear)</option>
                  <option value="POSITIVE">POSITIVE (Reactive - Trigger Discard)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Recording...' : 'Commit Screening'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
