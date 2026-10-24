import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  TrendingUp,
  Droplet,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus
} from 'lucide-react';
import HeroBanner from '../components/common/HeroBanner';
import StatCard from '../components/common/StatCard';
import DonorCardPreview from '../components/common/DonorCardPreview';
import Modal from '../components/common/Modal';
import { inventoryApi, requestApi, donorApi, donationApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { lastInventoryEvent, liveAlerts } = useSocket();

  // Dashboard stats state loaded from real backend
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
    donated_at: new Date().toISOString(),
    volume_ml: 350,
    hemoglobin_gdl: 14.2,
    components: ['RED_CELLS', 'PLASMA']
  });

  const [actionMessage, setActionMessage] = useState(null);

  // Fetch real data from database through API
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch live inventory
      const invRes = await inventoryApi.getInventory();
      const invData = invRes.data || [];
      setInventory(invData);

      // Compute total available & expiring units
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
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Refresh data whenever a real-time websocket event occurs
  useEffect(() => {
    if (lastInventoryEvent) {
      loadDashboardData();
    }
  }, [lastInventoryEvent]);

  // Handle FEFO 1-click allocation from dashboard table
  const handleFEFOAllocate = async (requestId) => {
    try {
      const res = await requestApi.allocateFEFO(requestId);
      setActionMessage({
        type: 'success',
        text: `Successfully allocated ${res.data.allocated_units} unit(s) via FEFO!`
      });
      loadDashboardData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'FEFO Allocation failed. Check stock availability.'
      });
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Handle Register Donor Submit
  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    try {
      const res = await donorApi.updateDonor ? await donorApi.getDonors() : null; // test
      const response = await fetch('/api/v1/auth/register-donor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Registration failed');

      setShowRegisterModal(false);
      setActionMessage({
        type: 'success',
        text: `Donor registered successfully with Donor ID #${data.data.donor_id}!`
      });
      loadDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Record Donation Submit
  const handleRecordDonation = async (e) => {
    e.preventDefault();
    try {
      await donationApi.createDonation({
        ...donationForm,
        donor_id: Number(donationForm.donor_id),
        branch_id: Number(donationForm.branch_id),
        volume_ml: Number(donationForm.volume_ml),
        hemoglobin_gdl: Number(donationForm.hemoglobin_gdl)
      });
      setShowDonationModal(false);
      setActionMessage({
        type: 'success',
        text: 'Blood donation recorded and quarantine units created!'
      });
      loadDashboardData();
    } catch (err) {
      alert(`Donation Failed: ${err.message}`);
    }
  };

  // Filter inventory data by component
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const stockByGroup = bloodGroups.map((bg) => {
    const rows = inventory.filter((item) => {
      const matchGroup = item.blood_group === bg;
      if (selectedComponent === 'ALL') return matchGroup;
      return matchGroup && item.component === selectedComponent;
    });
    const count = rows.reduce((acc, r) => acc + (r.units_available || 0), 0);
    return { group: bg, count };
  });

  const maxStock = Math.max(...stockByGroup.map((s) => s.count), 10);

  return (
    <div>
      {/* 1. Hero Gradient Banner matching Hope UI screenshot */}
      <HeroBanner
        onRegisterDonor={() => setShowRegisterModal(true)}
        onNewDonation={() => setShowDonationModal(true)}
        onFEFOAllocate={() => setShowFEFOModal(true)}
      />

      {/* Action Notification Alert Toast */}
      {actionMessage && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: actionMessage.type === 'success' ? '#e8f5ec' : '#fbebee',
          color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
          borderLeft: `4px solid ${actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          fontWeight: '600',
          fontSize: '13px'
        }}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* 2. Top 4 Stat Cards with Circular Progress Dials matching screenshot */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '26px'
      }}>
        <StatCard
          title="Total Available Stock"
          value={stats.totalAvailable.toLocaleString()}
          subtitle="Ready to Issue"
          percent={Math.min(100, Math.round((stats.totalAvailable / 500) * 100))}
          color="#3a57e8"
          icon={PackageCheck}
        />

        <StatCard
          title="Units Nearing Expiry"
          value={stats.expiringSoon}
          subtitle="Within 7 Days"
          percent={Math.min(100, Math.round((stats.expiringSoon / 50) * 100))}
          color="#f16a1b"
          icon={AlertTriangle}
        />

        <StatCard
          title="Active Requisitions"
          value={stats.pendingRequests}
          subtitle="Hospital Demands"
          percent={Math.min(100, Math.round((stats.pendingRequests / 30) * 100))}
          color="#08b1ba"
          icon={FileSpreadsheet}
        />

        <StatCard
          title="Registered Donors"
          value={stats.totalDonors.toLocaleString()}
          subtitle="Verified 3-NF"
          percent={85}
          color="#7a5af8"
          icon={Users}
        />
      </div>

      {/* 3. Middle Section: Stock Breakdown Visualization & Glassmorphic Donor Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Left: Blood Stock Distribution by Blood Group */}
        <div className="hope-card" style={{ padding: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                Live Blood Inventory by Group
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real-time count of tested, quarantined, and available units from PostgreSQL
              </div>
            </div>

            {/* Filter Pill Selector */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f5f6fa', padding: '4px', borderRadius: '8px' }}>
              {['ALL', 'RED_CELLS', 'PLASMA', 'PLATELETS'].map((comp) => (
                <button
                  key={comp}
                  onClick={() => setSelectedComponent(comp)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: selectedComponent === comp ? '700' : '500',
                    backgroundColor: selectedComponent === comp ? '#ffffff' : 'transparent',
                    color: selectedComponent === comp ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: selectedComponent === comp ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {comp.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Graphical Bar Chart representing stock levels */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', paddingTop: '20px' }}>
            {stockByGroup.map((item) => {
              const heightPercent = Math.max(8, Math.round((item.count / maxStock) * 100));
              const isShortage = item.count < 5;

              return (
                <div key={item.group} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: isShortage ? 'var(--danger)' : 'var(--text-main)' }}>
                    {item.count}
                  </span>

                  <div style={{
                    width: '36px',
                    height: '160px',
                    backgroundColor: '#f0f3fe',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      background: isShortage
                        ? 'linear-gradient(180deg, #dc3545 0%, #f16a1b 100%)'
                        : 'linear-gradient(180deg, #3a57e8 0%, #08b1ba 100%)',
                      borderRadius: '8px',
                      transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: item.group.includes('-') ? 'var(--secondary)' : 'var(--primary)'
                  }}>
                    {item.group}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', gap: '18px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                Adequate Stock (&gt;= 5 units)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                Critical Shortage (&lt; 5 units)
              </span>
            </div>
            <a href="/inventory" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
              View Detailed Inventory →
            </a>
          </div>
        </div>

        {/* Right: Glassmorphic Clinical Access Badge matching screenshot */}
        <DonorCardPreview
          cardHolder={user?.full_name || 'Medical Officer'}
          bloodGroup="O+"
          clearance={user?.clearance || 2}
          idNumber={`USR-00${user?.user_id || 1}-PULSE`}
          status={user?.role?.toUpperCase() || 'STAFF'}
        />
      </div>

      {/* 4. Bottom Section: Hospital Requisitions & 1-Click FEFO Allocation */}
      <div className="hope-card" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              Hospital Blood Requisitions Queue
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              First-Expiry-First-Out (FEFO) automated unit allocation via PostgreSQL row locks
            </div>
          </div>
          <a href="/requests" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
            Manage All Requisitions →
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Req ID</th>
                <th style={{ padding: '12px 16px' }}>Hospital / Patient</th>
                <th style={{ padding: '12px 16px' }}>Blood Group</th>
                <th style={{ padding: '12px 16px' }}>Component</th>
                <th style={{ padding: '12px 16px' }}>Units (Alloc/Need)</th>
                <th style={{ padding: '12px 16px' }}>Urgency</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>FEFO Action</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No active hospital requisitions found
                  </td>
                </tr>
              ) : (
                recentRequests.map((req) => {
                  const isPending = ['PENDING', 'APPROVED', 'PARTIAL'].includes(req.status);
                  const isUrgent = req.urgency === 'EMERGENCY' || req.urgency === 'URGENT';

                  return (
                    <tr key={req.request_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)' }}>
                        #{req.request_id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700' }}>{req.hospital_name || 'Hospital'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {req.patient_ref}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f0f3fe',
                          color: 'var(--primary)'
                        }}>
                          {req.blood_group}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '500' }}>
                        {req.component.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700' }}>
                        {req.units_allocated || 0} / {req.units_needed}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: req.urgency === 'EMERGENCY' ? '#fbebee' : req.urgency === 'URGENT' ? '#fef0e8' : '#eaf4ff',
                          color: req.urgency === 'EMERGENCY' ? 'var(--danger)' : req.urgency === 'URGENT' ? 'var(--warning)' : 'var(--primary)'
                        }}>
                          {req.urgency}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: req.status === 'FULFILLED' ? '#e8f5ec' : isPending ? '#eaf4ff' : '#fbebee',
                          color: req.status === 'FULFILLED' ? 'var(--success)' : isPending ? 'var(--primary)' : 'var(--danger)'
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isPending ? (
                          <button
                            onClick={() => handleFEFOAllocate(req.request_id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: isUrgent ? 'var(--danger)' : 'var(--primary)',
                              color: '#ffffff',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              boxShadow: '0 2px 6px rgba(58, 87, 232, 0.2)'
                            }}
                          >
                            <Zap size={13} />
                            FEFO Allocate
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Register Donor */}
      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Register New Blood Donor">
        <form onSubmit={handleRegisterDonor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Full Name</label>
            <input
              type="text"
              required
              value={regForm.full_name}
              onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Email (Username)</label>
              <input
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Phone (10-digit Indian Mobile)</label>
              <input
                type="text"
                required
                pattern="^[6-9][0-9]{9}$"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Blood Group</label>
              <select
                value={regForm.blood_group}
                onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                {bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Gender</label>
              <select
                value={regForm.gender}
                onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="M">Male (90d gap)</option>
                <option value="F">Female (120d gap)</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Weight (kg &gt;= 45)</label>
              <input
                type="number"
                min="45"
                required
                value={regForm.weight_kg}
                onChange={(e) => setRegForm({ ...regForm, weight_kg: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Date of Birth (18-65 yrs)</label>
              <input
                type="date"
                required
                value={regForm.date_of_birth}
                onChange={(e) => setRegForm({ ...regForm, date_of_birth: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Region Code</label>
              <select
                value={regForm.region_code}
                onChange={(e) => setRegForm({ ...regForm, region_code: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="SUR">Surat (SUR)</option>
                <option value="AHM">Ahmedabad (AHM)</option>
                <option value="VAD">Vadodara (VAD)</option>
                <option value="RAJ">Rajkot (RAJ)</option>
              </select>
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
            Create Encrypted Donor Profile
          </button>
        </form>
      </Modal>

      {/* MODAL 2: Record Donation */}
      <Modal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} title="Record Blood Donation Intake">
        <form onSubmit={handleRecordDonation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Donor ID</label>
              <input
                type="number"
                required
                value={donationForm.donor_id}
                onChange={(e) => setDonationForm({ ...donationForm, donor_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Branch ID</label>
              <input
                type="number"
                required
                value={donationForm.branch_id}
                onChange={(e) => setDonationForm({ ...donationForm, branch_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Volume (200-500 ml)</label>
              <input
                type="number"
                min="200"
                max="500"
                required
                value={donationForm.volume_ml}
                onChange={(e) => setDonationForm({ ...donationForm, volume_ml: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Hemoglobin (g/dL &gt;= 12.5)</label>
              <input
                type="number"
                step="0.1"
                min="12.5"
                required
                value={donationForm.hemoglobin_gdl}
                onChange={(e) => setDonationForm({ ...donationForm, hemoglobin_gdl: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Component Bags to Produce</label>
            <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '13px' }}>
              {['RED_CELLS', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'].map((c) => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={donationForm.components.includes(c)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDonationForm({ ...donationForm, components: [...donationForm.components, c] });
                      } else {
                        setDonationForm({ ...donationForm, components: donationForm.components.filter((x) => x !== c) });
                      }
                    }}
                  />
                  {c.replace('_', ' ')}
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
            Submit Donation (Verify Gap via Trigger)
          </button>
        </form>
      </Modal>

      {/* MODAL 3: FEFO Quick Allocate */}
      <Modal isOpen={showFEFOModal} onClose={() => setShowFEFOModal(false)} title="Automated FEFO Allocation">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Select any open hospital request to execute PostgreSQL <code>fn_allocate_fefo()</code> using row-level locking (<code>FOR UPDATE SKIP LOCKED</code>) to prevent race conditions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentRequests.filter((r) => r.status === 'PENDING' || r.status === 'PARTIAL').map((r) => (
              <div key={r.request_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                backgroundColor: '#f8f9fd'
              }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>Req #{r.request_id} - {r.hospital_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Needs {r.units_needed} units of {r.blood_group} ({r.component})
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleFEFOAllocate(r.request_id);
                    setShowFEFOModal(false);
                  }}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  Allocate Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
