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
  FileText,
  Layers
} from 'lucide-react';
import HeroBanner from '../../components/common/HeroBanner';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { screeningApi, unitApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';

export default function LabTechDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { isConnected, lastInventoryEvent } = useSocket();

  const [loading, setLoading] = useState(true);
  const [screenings, setScreenings] = useState([]);
  const [quarantineUnits, setQuarantineUnits] = useState([]);
  const [pendingDonations, setPendingDonations] = useState([]);
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
      const [scrRes, unitRes, pendRes] = await Promise.all([
        screeningApi.getScreenings(),
        unitApi.getUnits({ status: 'QUARANTINE', limit: 25 }),
        screeningApi.getPendingScreenings()
      ]);

      setScreenings(scrRes.data || []);
      setQuarantineUnits(unitRes.data || []);
      setPendingDonations(pendRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load laboratory queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabData();
  }, [lastInventoryEvent]);

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

  const handleQuickPassAll = async (donationId, pendingTests) => {
    try {
      setSubmitting(true);
      for (const t of pendingTests) {
        await screeningApi.createScreening({
          donation_id: donationId,
          test_type: t,
          result: 'NEGATIVE',
          report: { method: 'EIA_ELISA', note: 'Standard viral safety panel clear' }
        });
      }
      toast.success(
        `All ${pendingTests.length} tests recorded NEGATIVE for Donation #${donationId}. Units released to AVAILABLE!`,
        'Specimen Cleared'
      );
      loadLabData();
    } catch (err) {
      toast.error(err.message || 'Quick testing failed');
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
          label="Pending Batches"
          value={pendingDonations.length}
          badgeText="Awaiting Testing"
          color="#f59e0b"
        />
        <StatCard
          icon={Layers}
          label="Quarantined Units"
          value={quarantineUnits.length}
          badgeText="Bags Locked"
          color="#d97706"
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
      </div>

      {/* DEDICATED LAB TECHNICIAN WORKLIST: Pending Blood Lab Screening Queue */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Microscope size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Pending Blood Lab Screening Queue
              </h3>
              <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                {pendingDonations.length} Batch(es) Pending
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Only certified laboratory specialists have access to this queue. Passing all 5 tests releases component units to AVAILABLE.
            </p>
          </div>
        </div>

        {pendingDonations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>All Screening Tests Complete</div>
            <div style={{ fontSize: '12px' }}>Zero donations currently awaiting viral screening.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingDonations.map((don) => (
              <div
                key={don.donation_id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)' }}>
                      Donation #{don.donation_id}
                    </span>
                    <span style={{ fontWeight: '800', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0f3fe', color: 'var(--primary)' }}>
                      {don.blood_group}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {don.donor_name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      • {don.volume_ml} mL • {don.branch_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA'].map((testName) => {
                      const completed = (don.completed_tests || []).find(t => t.test_type === testName);
                      const isNeg = completed?.result === 'NEGATIVE';
                      const isPos = completed?.result === 'POSITIVE';

                      return (
                        <span
                          key={testName}
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: isNeg ? '#dcfce7' : isPos ? '#fee2e2' : '#fef3c7',
                            color: isNeg ? '#15803d' : isPos ? '#b91c1c' : '#b45309',
                            border: `1px solid ${isNeg ? '#bbf7d0' : isPos ? '#fecaca' : '#fde68a'}`
                          }}
                        >
                          {isNeg && <CheckCircle2 size={12} />}
                          {isPos && <XCircle size={12} />}
                          {!completed && <Clock size={12} />}
                          {testName}: {completed ? completed.result : 'PENDING'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setTestForm({
                        donation_id: don.donation_id,
                        test_type: don.pending_tests[0] || 'HIV',
                        result: 'NEGATIVE',
                        report: { notes: 'Automated screening panel analysis' }
                      });
                      setShowTestModal(true);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Microscope size={14} /> Run Test ({don.pending_tests[0] || 'Next'})
                  </button>

                  {don.pending_tests.length > 0 && (
                    <button
                      onClick={() => handleQuickPassAll(don.donation_id, don.pending_tests)}
                      disabled={submitting}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} /> Pass Remaining Negative ({don.pending_tests.length})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
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
              Quarantine Bag Inventory
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Physical component units locked pending viral clearance
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
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
