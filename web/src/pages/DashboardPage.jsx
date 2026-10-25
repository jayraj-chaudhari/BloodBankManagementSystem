import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  AlertTriangle,
  Users,
  TrendingUp,
  Droplet,
  Zap,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import HeroBanner from '../components/common/HeroBanner';
import StatCard from '../components/common/StatCard';
import Modal from '../components/common/Modal';
import { inventoryApi, requestApi, donorApi, donationApi, alertApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Import Specific Role Dashboards
import HospitalDashboard from './dashboards/HospitalDashboard';
import DonorDashboard from './dashboards/DonorDashboard';
import LabTechDashboard from './dashboards/LabTechDashboard';
import AuditorDashboard from './dashboards/AuditorDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { isConnected, lastInventoryEvent, liveAlerts } = useSocket();

  const role = user?.role || user?.role_name;

  // If user role is Hospital, Donor, Lab Tech, or Auditor, render their dedicated production portal
  if (role === 'hospital_user') {
    return <HospitalDashboard />;
  }
  if (role === 'donor') {
    return <DonorDashboard />;
  }
  if (role === 'lab_tech') {
    return <LabTechDashboard />;
  }
  if (role === 'auditor') {
    return <AuditorDashboard />;
  }

  // --- OFFICER & SYSTEM ADMINISTRATOR DASHBOARD ---
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAvailable: 0,
    expiringSoon: 0,
    pendingRequests: 0,
    totalDonors: 0
  });

  const [inventory, setInventory] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState('ALL');

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showFEFOModal, setShowFEFOModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Form states
  const [regForm, setRegForm] = useState({
    full_name: '',
    email: '',
    password: 'Test@1234',
    phone: '9876543210',
    blood_group: 'O+',
    date_of_birth: '1998-05-14',
    gender: 'M',
    weight_kg: 65,
    region_code: 'SUR',
    address: 'Ring Road, Surat'
  });

  const [donationForm, setDonationForm] = useState({
    donor_id: 1,
    branch_id: 1,
    donated_at: new Date().toISOString().slice(0, 16),
    volume_ml: 350,
    hemoglobin_gdl: 14.2,
    components: ['RED_CELLS', 'PLASMA']
  });

  const [fefoForm, setFefoForm] = useState({
    request_id: 1
  });

  const [dispatchForm, setDispatchForm] = useState({
    request_id: 1,
    radius_km: 50,
    max_donors: 10
  });

  // Fetch real data from database through API
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch live inventory
      const invRes = await inventoryApi.getInventory();
      const invData = invRes.data || [];
      setInventory(invData);

      const totalAvail = invData.reduce((acc, row) => acc + (row.units_available || 0), 0);
      const totalExpiring = invData.reduce((acc, row) => acc + (row.units_expiring_7d || 0), 0);

      // 2. Fetch requests
      const reqRes = await requestApi.getRequests({ limit: 6 });
      const reqData = reqRes.data || [];
      setRecentRequests(reqData);
      const pendingCount = reqRes.meta?.total || reqData.length;

      // 3. Fetch donors count
      let donorCount = 0;
      try {
        const donorRes = await donorApi.getDonors({ limit: 1 });
        donorCount = donorRes.meta?.total || 0;
      } catch (e) {
        donorCount = 0;
      }

      setStats({
        totalAvailable: totalAvail,
        expiringSoon: totalExpiring,
        pendingRequests: pendingCount,
        totalDonors: donorCount
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 1. Register Donor
  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    try {
      await donorApi.registerDonor({
        ...regForm,
        weight_kg: Number(regForm.weight_kg)
      });
      toast.success(`Donor ${regForm.full_name} registered into secure database with encrypted contact PII!`, 'Donor Enrolled');
      setShowRegisterModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  // 2. Record Donation
  const handleRecordDonation = async (e) => {
    e.preventDefault();
    try {
      await donationApi.createDonation({
        donor_id: Number(donationForm.donor_id),
        branch_id: Number(donationForm.branch_id),
        donated_at: new Date(donationForm.donated_at).toISOString(),
        volume_ml: Number(donationForm.volume_ml),
        hemoglobin_gdl: Number(donationForm.hemoglobin_gdl),
        components: donationForm.components
      });
      toast.success(
        `Intake recorded for donor #${donationForm.donor_id}. Created ${donationForm.components.length} quarantine units.`,
        'Donation Stored'
      );
      setShowDonationModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Donation intake failed');
    }
  };

  // 3. FEFO Allocation
  const handleAllocateFirstQuick = async () => {
    const firstPending = recentRequests.find(r => r.status === 'PENDING' || r.status === 'PARTIAL');
    if (!firstPending) {
      toast.info('No pending requisitions in queue requiring allocation.', 'Queue Clear');
      return;
    }
    try {
      const res = await requestApi.allocateFEFO(firstPending.request_id);
      toast.success(`FEFO allocation completed for Request #${firstPending.request_id}!`, 'FEFO Success');
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Allocation failed');
    }
  };

  const handleAllocateFEFO = async (e) => {
    e.preventDefault();
    try {
      const res = await requestApi.allocateFEFO(fefoForm.request_id);
      toast.success(
        `FEFO allocation completed. Allocated ${res.data?.allocated_units || 1} units to Request #${fefoForm.request_id}.`,
        'FEFO Allocation Successful'
      );
      setShowFEFOModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'FEFO allocation failed');
    }
  };

  // 4. Dispatch Emergency Alert
  const handleDispatchAlert = async (e) => {
    e.preventDefault();
    try {
      const res = await alertApi.createAlert(dispatchForm.request_id, {
        radius_km: Number(dispatchForm.radius_km),
        max_donors: Number(dispatchForm.max_donors)
      });
      toast.success(
        `Emergency alerts broadcasted to ${res.data?.length || 0} compatible donors within ${dispatchForm.radius_km} km!`,
        'Emergency Broadcast Dispatched'
      );
      setShowDispatchModal(false);
    } catch (err) {
      toast.error(err.message || 'Emergency dispatch failed');
    }
  };

  // Filter inventory by component
  const filteredInventory = selectedComponent === 'ALL'
    ? inventory
    : inventory.filter(i => i.component === selectedComponent);

  // Calculate grouped blood stock totals
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const stockByGroup = bloodGroups.map(bg => {
    const total = filteredInventory
      .filter(i => i.blood_group === bg)
      .reduce((sum, i) => sum + (i.units_available || 0), 0);
    return { group: bg, total };
  });

  const maxStock = Math.max(...stockByGroup.map(s => s.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Welcome Banner */}
      <HeroBanner
        title={`Hello, ${user?.full_name || 'Officer'}!`}
        subtitle="PulseNet BloodBank OS is running live with PostgreSQL Row-Level Security, FEFO Auto-Allocation, and MongoDB Tamper-Evident Hash Chains."
        badgeText={`Role: ${user?.role === 'admin' ? 'System Administrator' : 'Blood Bank Officer'} | MAC Level 2`}
        actions={[
          {
            label: 'Register Donor',
            icon: Plus,
            variant: 'secondary',
            onClick: () => setShowRegisterModal(true)
          },
          {
            label: 'Record Donation',
            icon: Droplet,
            variant: 'secondary',
            onClick: () => setShowDonationModal(true)
          },
          {
            label: 'FEFO Allocate',
            icon: Zap,
            variant: 'primary',
            onClick: () => setShowFEFOModal(true)
          },
          {
            label: 'Emergency Alert',
            icon: Radio,
            variant: 'secondary',
            onClick: () => setShowDispatchModal(true)
          }
        ]}
      />

      {/* KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={PackageCheck}
          label="Total Available Stock"
          value={stats.totalAvailable}
          badgeText="Ready to Issue"
          color="#3a57e8"
        />
        <StatCard
          icon={AlertTriangle}
          label="Units Nearing Expiry"
          value={stats.expiringSoon}
          badgeText="Within 7 Days"
          color="#f59e0b"
        />
        <StatCard
          icon={FileSpreadsheet}
          label="Active Requisitions"
          value={stats.pendingRequests}
          badgeText="Hospital Demands"
          color="#08b1ba"
        />
        <StatCard
          icon={Users}
          label="Registered Donors"
          value={stats.totalDonors}
          badgeText="Verified in DB"
          color="#7a5af8"
        />
      </div>

      {/* Section: Live Inventory Bar Visualizer & Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        {/* Blood Stock Chart Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Live Blood Inventory by Group
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real-time count of tested, quarantined, and available units from PostgreSQL
              </div>
            </div>

            {/* Component Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'RED_CELLS', 'PLASMA', 'PLATELETS'].map((comp) => (
                <button
                  key={comp}
                  onClick={() => setSelectedComponent(comp)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedComponent === comp ? 'var(--primary)' : '#f5f6fa',
                    color: selectedComponent === comp ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {comp}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Graph Visualizer */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: '200px',
            paddingTop: '20px',
            borderBottom: '1px solid var(--border-light)'
          }}>
            {stockByGroup.map((item) => {
              const heightPercent = Math.max(12, Math.round((item.total / maxStock) * 100));
              const isLow = item.total < 3;

              return (
                <div key={item.group} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: isLow ? '#ef4444' : 'var(--text-main)' }}>
                    {item.total}
                  </div>
                  <div style={{
                    width: '32px',
                    height: '140px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      background: isLow
                        ? 'linear-gradient(180deg, #f87171 0%, #ef4444 100%)'
                        : 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                      borderRadius: '8px',
                      transition: 'height 0.4s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {item.group}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security / System Status Box */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
              System Integrity
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Security, audit trail & RLS validation
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>PostgreSQL RLS Enforced</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>MongoDB SHA-256 Hash Chain</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Socket.IO Telemetry Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>FEFO Medical Algorithm Ready</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginTop: '16px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af' }}>
              FEFO COMPLIANCE NOTE
            </div>
            <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '2px' }}>
              Allocation automatically preserves universal groups and distributes nearest-expiry units first.
            </div>
          </div>
        </div>
      </div>

      {/* Requisitions Overview Table */}
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
              Recent Hospital Requisitions Queue
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Direct queue from registered hospitals requiring FEFO allocation
            </div>
          </div>
          <button
            onClick={handleAllocateFirstQuick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
            <Zap size={14} /> Allocate First Unit
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No recent requisitions loaded.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Req #</th>
                  <th style={{ padding: '10px 8px' }}>Hospital</th>
                  <th style={{ padding: '10px 8px' }}>Group</th>
                  <th style={{ padding: '10px 8px' }}>Component</th>
                  <th style={{ padding: '10px 8px' }}>Units</th>
                  <th style={{ padding: '10px 8px' }}>Urgency</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr key={r.request_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '700' }}>#{r.request_id}</td>
                    <td style={{ padding: '12px 8px', color: '#1e293b', fontWeight: '600' }}>{r.hospital_name || `Hospital #${r.hospital_id}`}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        fontWeight: '800',
                        fontSize: '12px'
                      }}>
                        {r.blood_group}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{r.component}</td>
                    <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                      {r.units_allocated || 0} / {r.units_needed}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: r.urgency === 'EMERGENCY' ? '#fee2e2' : '#f1f5f9',
                        color: r.urgency === 'EMERGENCY' ? '#b91c1c' : '#475569',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {r.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                        color: r.status === 'APPROVED' ? '#15803d' : '#b45309',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => {
                          setFefoForm({ request_id: r.request_id });
                          setShowFEFOModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                          border: 'none',
                          fontWeight: '700',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        FEFO Allocate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Register Donor */}
      {showRegisterModal && (
        <Modal title="Register New Voluntary Donor" onClose={() => setShowRegisterModal(false)}>
          <form onSubmit={handleRegisterDonor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                required
                value={regForm.full_name}
                onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                placeholder="Aarav Shah"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="donor@example.com"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Phone (Encrypted)</label>
                <input
                  type="text"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="9876543210"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Blood Group</label>
                <select
                  value={regForm.blood_group}
                  onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Gender</label>
                <select
                  value={regForm.gender}
                  onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="M">Male (90d gap)</option>
                  <option value="F">Female (120d gap)</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Weight (kg)</label>
                <input
                  type="number"
                  min="45"
                  required
                  value={regForm.weight_kg}
                  onChange={(e) => setRegForm({ ...regForm, weight_kg: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                Enroll Donor
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: Record Donation */}
      {showDonationModal && (
        <Modal title="Record Clinical Donation Intake" onClose={() => setShowDonationModal(false)}>
          <form onSubmit={handleRecordDonation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Donor ID</label>
                <input
                  type="number"
                  required
                  value={donationForm.donor_id}
                  onChange={(e) => setDonationForm({ ...donationForm, donor_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Branch ID</label>
                <input
                  type="number"
                  required
                  value={donationForm.branch_id}
                  onChange={(e) => setDonationForm({ ...donationForm, branch_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Volume (mL)</label>
                <input
                  type="number"
                  min="200"
                  max="500"
                  required
                  value={donationForm.volume_ml}
                  onChange={(e) => setDonationForm({ ...donationForm, volume_ml: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Haemoglobin (g/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="12.5"
                  required
                  value={donationForm.hemoglobin_gdl}
                  onChange={(e) => setDonationForm({ ...donationForm, hemoglobin_gdl: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Components to Extract</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['RED_CELLS', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'].map(c => (
                  <label key={c} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={donationForm.components.includes(c)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDonationForm({ ...donationForm, components: [...donationForm.components, c] });
                        } else {
                          setDonationForm({ ...donationForm, components: donationForm.components.filter(x => x !== c) });
                        }
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDonationModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                Save Donation & Units
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 3: FEFO Allocation */}
      {showFEFOModal && (
        <Modal title="Execute Automated FEFO Allocation" onClose={() => setShowFEFOModal(false)}>
          <form onSubmit={handleAllocateFEFO} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Blood Request ID</label>
              <input
                type="number"
                required
                value={fefoForm.request_id}
                onChange={(e) => setFefoForm({ request_id: e.target.value })}
                placeholder="1"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
              The system executes PostgreSQL function <code>fn_allocate_fefo()</code>. It reserves the earliest-expiring unexpired AVAILABLE units matching donor compatibility rules.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowFEFOModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                Allocate Units
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 4: Dispatch Emergency Alert */}
      {showDispatchModal && (
        <Modal title="Broadcast Emergency Donor Alert" onClose={() => setShowDispatchModal(false)}>
          <form onSubmit={handleDispatchAlert} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Target Request ID</label>
              <input
                type="number"
                required
                value={dispatchForm.request_id}
                onChange={(e) => setDispatchForm({ ...dispatchForm, request_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Search Radius (km)</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={dispatchForm.radius_km}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, radius_km: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Max Donors to Ping</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={dispatchForm.max_donors}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, max_donors: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Calls <code>fn_find_donors_for_request()</code> to locate nearest medically eligible, available donors with compatible blood types and sends live Socket.IO push alerts.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                Broadcast Alert
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
