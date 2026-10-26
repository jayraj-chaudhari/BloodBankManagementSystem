import React, { useState, useEffect } from 'react';
import {
  Microscope,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  ShieldCheck,
  Lock,
  Activity,
  Check,
  Search,
  RotateCcw,
  EyeOff,
  ShieldAlert,
  FileKey2,
  Database,
  ArrowRight,
  Shield,
  Layers,
  KeyRound,
  UserCheck
} from 'lucide-react';
import { screeningApi, donationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/common/Modal';

export default function ScreeningsPage() {
  const { user } = useAuth();
  const { lastDonationEvent, lastInventoryEvent } = useSocket();
  const role = user?.role || user?.role_name;
  const isLabTech = role === 'lab_tech';
  const isDonor = role === 'donor';
  const isAdmin = role === 'admin';

  const [donationIdInput, setDonationIdInput] = useState('');
  const [activeDonationId, setActiveDonationId] = useState(null);
  const [donorDonations, setDonorDonations] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    donation_id: '',
    test_type: 'HIV',
    result: 'NEGATIVE',
    notes: 'Automated chemiluminescence panel passed'
  });

  const loadDonorDonations = async () => {
    try {
      const res = await donationApi.getDonationsMe();
      const list = res.data || [];
      setDonorDonations(list);
      if (list.length > 0) {
        const firstId = String(list[0].donation_id);
        setDonationIdInput(firstId);
        setActiveDonationId(firstId);
        loadScreenings(firstId);
      }
    } catch (err) {
      console.error('Failed to load donor donations:', err);
    }
  };

  const loadPendingQueue = async () => {
    if (!isLabTech) return;
    try {
      setPendingLoading(true);
      const res = await screeningApi.getPendingScreenings();
      setPendingQueue(res.data || []);
    } catch (err) {
      console.error('Failed to load pending screenings:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadScreenings = async (id = null) => {
    try {
      setLoading(true);
      setMessage(null);
      if (id) {
        const res = await screeningApi.getScreenings(id);
        setScreenings(res.data || []);
        setActiveDonationId(id);
      } else {
        const res = await screeningApi.getScreenings();
        setScreenings(res.data || []);
        setActiveDonationId(null);
      }
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
      loadScreenings(activeDonationId);
      loadPendingQueue();
    }
  }, [role, lastDonationEvent, lastInventoryEvent]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!donationIdInput || donationIdInput.trim() === '') {
      loadScreenings(null);
    } else {
      loadScreenings(donationIdInput.trim());
    }
  };

  const handleClearFilter = () => {
    setDonationIdInput('');
    loadScreenings(null);
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await screeningApi.createScreening({
        donation_id: Number(form.donation_id),
        test_type: form.test_type,
        result: form.result,
        report: { notes: form.notes, method: 'CHEMILUMINESCENCE_AUTOMATED' }
      });

      setMessage({ type: 'success', text: `Recorded ${form.test_type} screening as ${form.result} for Donation #${form.donation_id}!` });
      setShowModal(false);
      loadScreenings(activeDonationId || form.donation_id);
      loadPendingQueue();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Screening submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPassAll = async (pendingItem) => {
    try {
      setSubmitting(true);
      setMessage(null);
      const testsToRun = pendingItem.pending_tests || [];
      if (testsToRun.length === 0) return;

      for (const t of testsToRun) {
        await screeningApi.createScreening({
          donation_id: pendingItem.donation_id,
          test_type: t,
          result: 'NEGATIVE',
          report: { method: 'CHEMILUMINESCENCE_AUTOMATED', result: 'NON_REACTIVE' }
        });
      }
      setMessage({
        type: 'success',
        text: `Completed all ${testsToRun.length} remaining tests for Donation #${pendingItem.donation_id}. Units released to AVAILABLE!`
      });
      loadPendingQueue();
      loadScreenings(activeDonationId);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to complete remaining tests' });
    } finally {
      setSubmitting(false);
    }
  };

  const tests = ['HIV', 'HBV', 'HCV', 'SYPHILIS', 'MALARIA'];

  // Access Control Isolation UI for Administrators and unauthorized roles
  if (!isLabTech && !isDonor) {
    return (
      <div style={{ maxWidth: '1150px', margin: '20px auto 60px auto' }}>
        {/* Top Header Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.4px',
              border: '1px solid #fecaca'
            }}>
              <ShieldAlert size={15} />
              CLASSIFIED CLINICAL LAB BENCH &bull; MAC LEVEL 3 ISOLATION
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              <EyeOff size={14} />
              Concealed from {isAdmin ? 'System Administrator' : role}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Regulatory Compliance: HIPAA &bull; ISO 27799 &bull; Bell-LaPadula Security Model
          </div>
        </div>

        {/* Hero Security Card with Custom Logo */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e1b4b 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '42px 36px',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '28px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Decorative background glow rings */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0) 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
            {/* Custom High-Security Shield & Lock Logo */}
            <div style={{
              position: 'relative',
              width: '100px',
              height: '100px',
              borderRadius: '28px',
              background: 'linear-gradient(145deg, #ef4444 0%, #b91c1c 50%, #450a0a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 28px rgba(220, 38, 38, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
              flexShrink: 0,
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {/* Outer Security Ring */}
              <div style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '34px',
                border: '2px dashed rgba(239, 68, 68, 0.4)',
                pointerEvents: 'none'
              }} />

              {/* Centered Shield & EyeOff Icons */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={48} color="#ffffff" strokeWidth={2.2} />
                <Lock
                  size={22}
                  color="#ffffff"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -42%)'
                  }}
                  strokeWidth={2.6}
                />
              </div>

              {/* Floating EyeOff indicator badge */}
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                backgroundColor: '#0f172a',
                borderRadius: '50%',
                padding: '6px',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EyeOff size={14} color="#fca5a5" />
              </div>
            </div>

            {/* Header Content */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.4px', margin: 0, color: '#ffffff' }}>
                  Clinical Screening Diagnostics Concealed
                </h1>
                <span style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}>
                  RESTRICTED ACCESS
                </span>
              </div>

              <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.65', margin: '0 0 16px 0', maxWidth: '820px' }}>
                Under strict <strong>Healthcare Privacy Regulations (HIPAA & ISO 27799)</strong> and PostgreSQL <strong>Mandatory Access Control (Bell-LaPadula MAC Clearance Level 3)</strong>, System Administrators are deliberately partitioned from infectious disease screening results and testing benches to uphold patient-physician privilege and eliminate administrative medical surveillance.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <UserCheck size={14} color="#38bdf8" />
                  <span>Your Role: <strong>{isAdmin ? 'System Administrator (bb_admin)' : role}</strong></span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <KeyRound size={14} color="#f59e0b" />
                  <span>Assigned Clearance: <strong>Level {user?.clearance || 1} (ADMINISTRATIVE)</strong></span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <Lock size={14} color="#ef4444" />
                  <span>Required Clearance: <strong>Level 3 (RESTRICTED LAB)</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Information Matrix: What is Hidden & Security Architecture */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '28px' }}>
          {/* Card 1: What Information is Hidden */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EyeOff size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  What Information is Concealed?
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Protected clinical elements hidden from administrative oversight
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    1. Mandatory 5-Point Viral Safety Panel
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }}>
                    HIDDEN
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  Laboratory diagnostic outcomes for <strong>HIV-1/2</strong>, <strong>Hepatitis B (HBsAg)</strong>, <strong>Hepatitis C (HCV)</strong>, <strong>Syphilis (RPR)</strong>, and <strong>Malaria</strong> are concealed to protect donor confidentiality.
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    2. Specimen Quarantine & Release Queues
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px' }}>
                    HIDDEN
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  The active queue of unverified whole blood bags undergoing incubation, chemiluminescent testing, and quarantine clearance is isolated to licensed Laboratory Specialists.
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    3. Pathologist Sign-Offs & Diagnostic Notes
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 6px', borderRadius: '4px' }}>
                    HIDDEN
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  Optical density readings, ELISA cut-offs, inconclusive re-test schedules, and medical director clinical notes are shielded from IT database administrators.
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Architectural Enforcement */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Why is This Enforced by Design?
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Underlying database architecture and statutory compliance rules
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #6366f1' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Principle of Separation of Duties (SoD)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  IT System Administrators have extensive powers over accounts, network topology, and server maintenance. Granting access to sensitive medical diagnostics would create an ethical and compliance conflict of interest.
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Zero Table Grants on <code>screening_result</code>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  In PostgreSQL, <code>REVOKE ALL ON TABLE screening_result FROM PUBLIC, bb_admin;</code> is enforced. Only the certified <code>bb_lab_tech</code> role holds <code>SELECT</code> and <code>INSERT</code> privileges.
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '4px solid #08b1ba' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  Cryptographic Audit Trail in MongoDB
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                  Any attempt to query or manipulate clinical laboratory tables triggers immutable SHA-256 audit log entries verified by tamper-evident hash chaining.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Redacted Workstation Mockup Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '28px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Microscope size={18} color="#dc2626" />
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Redacted Clinical Workstation Preview
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '4px' }}>
              CONFIDENTIAL DATA REDACTED
            </span>
          </div>

          {/* Frosted Mock Table Container */}
          <div style={{
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}>
            {/* Blurry mock table */}
            <div style={{ filter: 'blur(3.5px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>SPECIMEN ID</th>
                    <th style={{ padding: '8px' }}>DONOR NAME</th>
                    <th style={{ padding: '8px' }}>VIRAL PANEL</th>
                    <th style={{ padding: '8px' }}>RESULT</th>
                    <th style={{ padding: '8px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px' }}>#SPEC-8921-HIV</td>
                    <td style={{ padding: '10px 8px' }}>Johnathan V. (Donor #41)</td>
                    <td style={{ padding: '10px 8px' }}>Chemiluminescence HIV-1/2</td>
                    <td style={{ padding: '10px 8px' }}><span style={{ color: '#059669' }}>NEGATIVE [0.12 OD]</span></td>
                    <td style={{ padding: '10px 8px' }}>Quarantine Release Approved</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px' }}>#SPEC-8922-HBV</td>
                    <td style={{ padding: '10px 8px' }}>Priya K. (Donor #42)</td>
                    <td style={{ padding: '10px 8px' }}>HBsAg Surface Antigen</td>
                    <td style={{ padding: '10px 8px' }}><span style={{ color: '#059669' }}>NEGATIVE [0.08 OD]</span></td>
                    <td style={{ padding: '10px 8px' }}>Quarantine Release Approved</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px' }}>#SPEC-8923-MAL</td>
                    <td style={{ padding: '10px 8px' }}>Rajesh S. (Donor #43)</td>
                    <td style={{ padding: '10px 8px' }}>Plasmodium Falciparum Screen</td>
                    <td style={{ padding: '10px 8px' }}><span style={{ color: '#059669' }}>NEGATIVE [Non-Reactive]</span></td>
                    <td style={{ padding: '10px 8px' }}>Released to AVAILABLE Units</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Centered Lock Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
              }}>
                <Lock size={16} />
                <span>Confidential Diagnostic Records Hidden from Administrator</span>
              </div>
              <div style={{ fontSize: '12px', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', maxWidth: '520px' }}>
                Operational queues, screening entry forms, and patient laboratory values are sealed under PostgreSQL Role-Based Security.
              </div>
            </div>
          </div>
        </div>

        {/* Authorized Specialist Delegation Box */}
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Microscope size={22} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a' }}>
                Laboratory Testing Operations Handled by Certified Specialist
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                Authorized Personnel: <strong>Dr. Suresh Mehta</strong> (<code>lab@bb.test</code>) &bull; Role: <code>bb_lab_tech</code> (MAC Level 3)
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700' }}>
            To record viral markers or test blood units, sign in with the Laboratory Specialist account.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {isDonor ? 'My Laboratory Screening Reports' : 'Laboratory Screening Bench'}
            </h2>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#fbebee', color: 'var(--danger)', padding: '3px 8px', borderRadius: '4px' }}>
              RESTRICTED MAC LEVEL 3
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {isDonor
              ? 'Infectious disease safety panel results for your donated blood units.'
              : 'Mandatory infectious screening. Passing all 5 tests transitions units from QUARANTINE to AVAILABLE.'}
          </p>
        </div>

        {isLabTech && (
          <button
            onClick={() => {
              setForm({
                donation_id: activeDonationId || (pendingQueue[0]?.donation_id ? String(pendingQueue[0].donation_id) : '1'),
                test_type: pendingQueue[0]?.pending_tests?.[0] || 'HIV',
                result: 'NEGATIVE',
                notes: 'Automated chemiluminescence panel passed'
              });
              setShowModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Record Lab Result
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {message && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: message.type === 'success' ? '#e8f5ec' : '#fbebee',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Lab Tech Pending Screening Queue */}
      {isLabTech && (
        <div className="hope-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Pending Blood Lab Screening Queue ({pendingQueue.length})
              </h3>
            </div>
            <button
              onClick={loadPendingQueue}
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={13} /> Refresh Queue
            </button>
          </div>

          {pendingLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Checking pending specimens...</div>
          ) : pendingQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <CheckCircle2 size={28} color="var(--success)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>All Screening Tests Complete</div>
              <div>No specimens currently pending viral screening. All collected units are screened or discarded.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Donation ID</th>
                    <th style={{ padding: '10px 14px' }}>Blood Group</th>
                    <th style={{ padding: '10px 14px' }}>Donor</th>
                    <th style={{ padding: '10px 14px' }}>Donated At</th>
                    <th style={{ padding: '10px 14px' }}>Quarantine Units</th>
                    <th style={{ padding: '10px 14px' }}>Tests Remaining</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.map((item) => {
                    const remainingTests = item.pending_tests || [];
                    return (
                      <tr key={item.donation_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800' }}>
                          <span style={{ color: 'var(--primary)' }}>Donation #{item.donation_id}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontWeight: '800',
                            color: '#dc2626',
                            backgroundColor: '#fee2e2',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            {item.blood_group}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-main)', fontWeight: '600' }}>
                          {item.donor_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(item.donated_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            backgroundColor: '#fffbeb',
                            color: '#d97706',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}>
                            {item.quarantine_units} in Quarantine
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {remainingTests.map((test) => (
                              <span
                                key={test}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f3f4f6',
                                  color: '#4b5563',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                {test}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setDonationIdInput(String(item.donation_id));
                                loadScreenings(item.donation_id);
                              }}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#f1f5f9',
                                color: 'var(--text-main)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer'
                              }}
                              title="Inspect this donation's safety panel"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => {
                                setDonationIdInput(String(item.donation_id));
                                loadScreenings(item.donation_id);
                                setForm({
                                  donation_id: String(item.donation_id),
                                  test_type: remainingTests[0] || 'HIV',
                                  result: 'NEGATIVE',
                                  notes: 'Automated chemiluminescence panel passed'
                                });
                                setShowModal(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: 'var(--primary)',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Run Test
                            </button>
                            {remainingTests.length > 0 && (
                              <button
                                onClick={() => handleQuickPassAll(item)}
                                disabled={submitting}
                                title="Record all missing tests as NEGATIVE and release to AVAILABLE"
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#e8f5ec',
                                  color: 'var(--success)',
                                  border: '1px solid var(--success)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: submitting ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={14} />
                                Pass Remaining ({remainingTests.length})
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="hope-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="number"
              placeholder={isDonor ? "Filter by your Donation ID..." : "Filter by Donation ID (e.g. 1)..."}
              value={donationIdInput}
              onChange={(e) => setDonationIdInput(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '9px 18px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Filter
          </button>

          {activeDonationId && (
            <button
              type="button"
              onClick={handleClearFilter}
              style={{
                padding: '9px 16px',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontSize: '13px',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              Show All
            </button>
          )}

          {isDonor && donorDonations.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>My Donations:</span>
              {donorDonations.map(d => (
                <button
                  key={d.donation_id}
                  type="button"
                  onClick={() => {
                    setDonationIdInput(String(d.donation_id));
                    loadScreenings(d.donation_id);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: activeDonationId === String(d.donation_id) ? 'var(--primary)' : '#f1f5f9',
                    color: activeDonationId === String(d.donation_id) ? '#ffffff' : 'var(--text-main)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  #{d.donation_id}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Main Screenings Results Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            {activeDonationId ? `Screening Results for Donation #${activeDonationId}` : 'Recent Infectious Disease Screenings (HIV, HBV, HCV, Syphilis, Malaria)'}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Total Recorded Tests: {screenings.length}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading screening panel records...</div>
        ) : screenings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Microscope size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>No Screening Results Found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {activeDonationId ? `Donation #${activeDonationId} has not been screened yet.` : 'No screening panel records logged in system.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Donation ID</th>
                  <th style={{ padding: '10px 14px' }}>Test Type</th>
                  <th style={{ padding: '10px 14px' }}>Result</th>
                  <th style={{ padding: '10px 14px' }}>Laboratory Notes / Method</th>
                  <th style={{ padding: '10px 14px' }}>Tested By</th>
                  <th style={{ padding: '10px 14px' }}>Tested At</th>
                </tr>
              </thead>
              <tbody>
                {screenings.map((s) => (
                  <tr key={s.screening_id || `${s.donation_id}-${s.test_type}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700' }}>
                      <span style={{ color: 'var(--primary)' }}>Donation #{s.donation_id}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '800' }}>
                      {s.test_type}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: s.result === 'NEGATIVE' ? '#e8f5ec' : s.result === 'POSITIVE' ? '#fbebee' : '#fffbeb',
                        color: s.result === 'NEGATIVE' ? 'var(--success)' : s.result === 'POSITIVE' ? 'var(--danger)' : 'var(--warning)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {s.result === 'NEGATIVE' && <CheckCircle2 size={13} />}
                        {s.result === 'POSITIVE' && <XCircle size={13} />}
                        {s.result === 'INCONCLUSIVE' && <AlertCircle size={13} />}
                        {s.result}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', maxWidth: '300px' }}>
                      {s.report?.notes || s.report?.method || 'Chemiluminescence Panel standard clear'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-main)', fontWeight: '600' }}>
                      {s.tested_by_name || 'Dr. Suresh Mehta'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(s.tested_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Recording Lab Test */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Infectious Screening Result"
        maxWidth="500px"
      >
        <form onSubmit={handleTestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Donation ID</label>
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
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Test Marker</label>
              <select
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                {tests.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Diagnostic Result</label>
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
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Lab Report Notes / Method</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              marginTop: '10px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Recording Screening...' : 'Submit Screening Result'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
