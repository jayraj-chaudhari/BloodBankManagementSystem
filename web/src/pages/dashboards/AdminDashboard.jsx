import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Building2,
  Lock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { adminApi, masterApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'hospitals'
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);

  // User form state
  const [userForm, setUserForm] = useState({
    email: '',
    password: 'Test@1234',
    full_name: '',
    role_name: 'bb_officer',
    branch_id: '',
    hospital_id: ''
  });

  // Hospital form state
  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: '',
    region_code: 'SUR',
    phone: '9876543210',
    latitude: 21.1702,
    longitude: 72.8311
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, hospitalsRes, branchesRes] = await Promise.all([
        adminApi.getUsers(),
        masterApi.getHospitals(),
        masterApi.getBranches()
      ]);
      setUsers(usersRes.data || []);
      setHospitals(hospitalsRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      toast.error(err.message || 'Failed to load administrative records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const payload = {
        email: userForm.email,
        password: userForm.password,
        full_name: userForm.full_name,
        role_name: userForm.role_name,
        branch_id: userForm.branch_id ? Number(userForm.branch_id) : undefined,
        hospital_id: userForm.hospital_id ? Number(userForm.hospital_id) : undefined
      };

      await adminApi.createUser(payload);
      toast.success(`Staff user ${userForm.full_name} (${userForm.role_name}) created successfully!`, 'User Created');
      setShowUserModal(false);
      setUserForm({
        email: '',
        password: 'Test@1234',
        full_name: '',
        role_name: 'bb_officer',
        branch_id: branches[0]?.branch_id ? String(branches[0].branch_id) : '',
        hospital_id: ''
      });
      loadData();
    } catch (err) {
      const errMsg = err.message || 'User creation failed';
      toast.error(errMsg, 'Validation Rejection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await masterApi.createHospital({
        hospital_name: hospitalForm.hospital_name,
        region_code: hospitalForm.region_code,
        phone: hospitalForm.phone,
        latitude: Number(hospitalForm.latitude),
        longitude: Number(hospitalForm.longitude)
      });

      toast.success(`Hospital "${hospitalForm.hospital_name}" registered! Listed as unverified under Discretionary Access Control.`, 'Hospital Added');
      setShowHospitalModal(false);
      setHospitalForm({
        hospital_name: '',
        region_code: 'SUR',
        phone: '9876543210',
        latitude: 21.1702,
        longitude: 72.8311
      });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Hospital registration failed', 'DAC Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpireSweep = async () => {
    try {
      const res = await inventoryApi.expireUnits();
      toast.success(`Expiry sweep completed: ${res.data?.expired_units || 0} unit(s) updated to EXPIRED.`, 'Cold-Chain Sweep');
    } catch (err) {
      toast.error(err.message || 'Sweep failed');
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Admin Executive Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        color: '#ffffff',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={28} color="#60a5fa" />
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>
                System Administration & Security Governance
              </h2>
              <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#ffffff' }}>
                ADMIN ROLE (DAC LEVEL 1)
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0 0 0', maxWidth: '700px' }}>
              Only Administrators have Discretionary Access Control (DAC) to insert hospitals and provision authenticated staff credentials.
              Passwords are stored exclusively as salted bcrypt hashes, and column-level DAC strictly conceals hash columns.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setUserForm({
                  email: '',
                  password: 'Test@1234',
                  full_name: '',
                  role_name: 'bb_officer',
                  branch_id: branches[0]?.branch_id ? String(branches[0].branch_id) : '',
                  hospital_id: ''
                });
                setShowUserModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Create Staff Account
            </button>

            <button
              onClick={() => setShowHospitalModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#334155',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                border: '1px solid #475569',
                cursor: 'pointer'
              }}
            >
              <Building2 size={16} /> Register Hospital
            </button>

            <button
              onClick={handleExpireSweep}
              title="Execute SQL function fn_expire_units()"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Clock size={16} /> Expiry Sweep
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="hope-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>REGISTERED STAFF USERS</div>
          <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--primary)' }}>{users.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Officers, Lab Techs, Auditors, Hospitals</div>
        </div>

        <div className="hope-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>AFFILIATED HOSPITALS</div>
          <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--danger)' }}>{hospitals.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {hospitals.filter(h => !h.is_verified).length} Unverified (DAC Protected)
          </div>
        </div>

        <div className="hope-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>REGIONAL BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--success)' }}>{branches.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Surat, Ahmedabad, Vadodara, Rajkot</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            backgroundColor: activeTab === 'users' ? 'var(--primary)' : '#f1f5f9',
            color: activeTab === 'users' ? '#ffffff' : 'var(--text-main)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Users size={16} /> Staff User Directory ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            backgroundColor: activeTab === 'hospitals' ? 'var(--primary)' : '#f1f5f9',
            color: activeTab === 'hospitals' ? '#ffffff' : 'var(--text-main)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Building2 size={16} /> Hospital Network Registry ({hospitals.length})
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="hope-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                Staff Users Directory (Column-Level DAC Proof)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                PostgreSQL Column DAC strictly prevents even <code>bb_admin</code> from reading <code>password_hash</code>.
              </p>
            </div>
            <button
              onClick={loadData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} /> Refresh List
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>User ID</th>
                  <th style={{ padding: '12px 14px' }}>Email</th>
                  <th style={{ padding: '12px 14px' }}>Full Name</th>
                  <th style={{ padding: '12px 14px' }}>System Role</th>
                  <th style={{ padding: '12px 14px' }}>Affiliation (Branch / Hospital)</th>
                  <th style={{ padding: '12px 14px' }}>Active</th>
                  <th style={{ padding: '12px 14px' }}>Password Hash Column</th>
                  <th style={{ padding: '12px 14px' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading staff records...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No staff accounts registered yet</td></tr>
                ) : (
                  users.map((u) => {
                    const isOfficer = u.role_name === 'bb_officer';
                    const isLabTech = u.role_name === 'lab_tech';
                    const isHospitalUser = u.role_name === 'hospital_user';
                    const isAdmin = u.role_name === 'admin';
                    const isAuditor = u.role_name === 'auditor';

                    return (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700' }}>#{u.user_id}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '600' }}>{u.email}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>{u.full_name}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: isAdmin ? '#fee2e2' : isOfficer ? '#e0f2fe' : isLabTech ? '#dcfce7' : isHospitalUser ? '#fef3c7' : '#f3e8ff',
                            color: isAdmin ? '#b91c1c' : isOfficer ? '#0369a1' : isLabTech ? '#15803d' : isHospitalUser ? '#b45309' : '#7e22ce'
                          }}>
                            {u.role_name}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {u.branch_name ? `Branch: ${u.branch_name}` : u.hospital_name ? `Hospital: ${u.hospital_name}` : 'Global Central'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                            {u.is_active ? '● ACTIVE' : '● INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            [REDACTED BY DAC]
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HOSPITALS REGISTRY */}
      {activeTab === 'hospitals' && (
        <div className="hope-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                Hospital Network Registry (Discretionary Access Control)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Only the administrator role possesses PostgreSQL <code>GRANT INSERT ON hospital</code> permissions.
              </p>
            </div>
            <button
              onClick={() => setShowHospitalModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Add Hospital
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Hospital ID</th>
                  <th style={{ padding: '12px 14px' }}>Hospital Name</th>
                  <th style={{ padding: '12px 14px' }}>Region Code</th>
                  <th style={{ padding: '12px 14px' }}>Contact Phone</th>
                  <th style={{ padding: '12px 14px' }}>Verification Status</th>
                  <th style={{ padding: '12px 14px' }}>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading hospital network...</td></tr>
                ) : hospitals.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No hospitals registered yet</td></tr>
                ) : (
                  hospitals.map((h) => (
                    <tr key={h.hospital_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700' }}>#{h.hospital_id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-main)' }}>{h.hospital_name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: '800', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '12px' }}>
                          {h.region_code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{h.phone || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: h.is_verified ? '#dcfce7' : '#fee2e2',
                          color: h.is_verified ? '#15803d' : '#b91c1c'
                        }}>
                          {h.is_verified ? 'VERIFIED' : 'NOT VERIFIED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE STAFF USER MODAL */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Create Staff Account (Admin Only)">
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Full Name *</label>
            <input
              type="text"
              required
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              placeholder="e.g. Officer Vikram Patel"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Email Address *</label>
              <input
                type="email"
                required
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="officer@bb.test"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Temporary Password *</label>
              <input
                type="password"
                required
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Role Designation *</label>
            <select
              value={userForm.role_name}
              onChange={(e) => setUserForm({ ...userForm, role_name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            >
              <option value="bb_officer">Blood Bank Officer (Requires Branch)</option>
              <option value="lab_tech">Laboratory Specialist (Requires Branch)</option>
              <option value="hospital_user">Hospital Representative (Requires Hospital)</option>
              <option value="auditor">Auditor (Regulatory Compliance)</option>
              <option value="donor">Donor (Demonstrates Least Privilege Rejection)</option>
            </select>
          </div>

          {['bb_officer', 'lab_tech'].includes(userForm.role_name) && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Affiliated Branch (CHECK Constraint) *</label>
              <select
                value={userForm.branch_id}
                onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="">[None - Test Integrity Constraint Rejection]</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.branch_name} ({b.region_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {userForm.role_name === 'hospital_user' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Affiliated Hospital *</label>
              <select
                value={userForm.hospital_id}
                onChange={(e) => setUserForm({ ...userForm, hospital_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="">Select Hospital</option>
                {hospitals.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.hospital_name} ({h.region_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={actionLoading}
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              marginTop: '10px',
              border: 'none',
              cursor: actionLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {actionLoading ? 'Creating User...' : 'Provision Staff Account'}
          </button>
        </form>
      </Modal>

      {/* CREATE HOSPITAL MODAL */}
      <Modal isOpen={showHospitalModal} onClose={() => setShowHospitalModal(false)} title="Register Hospital (DAC Enforced)">
        <form onSubmit={handleCreateHospital} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Hospital Name *</label>
            <input
              type="text"
              required
              value={hospitalForm.hospital_name}
              onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_name: e.target.value })}
              placeholder="e.g. Surat Metro Trauma Care"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Region Code *</label>
              <select
                value={hospitalForm.region_code}
                onChange={(e) => setHospitalForm({ ...hospitalForm, region_code: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="SUR">SUR (Surat)</option>
                <option value="AHM">AHM (Ahmedabad)</option>
                <option value="VAD">VAD (Vadodara)</option>
                <option value="RAJ">RAJ (Rajkot)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Phone Number *</label>
              <input
                type="text"
                required
                value={hospitalForm.phone}
                onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                placeholder="9876543210"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={hospitalForm.latitude}
                onChange={(e) => setHospitalForm({ ...hospitalForm, latitude: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={hospitalForm.longitude}
                onChange={(e) => setHospitalForm({ ...hospitalForm, longitude: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              marginTop: '10px',
              border: 'none',
              cursor: actionLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {actionLoading ? 'Registering...' : 'Register Hospital (DAC Insert)'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
