import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Droplet, UserPlus, HeartHandshake, Phone, Calendar, User, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/api';

const REGION_COORDINATES = {
  SUR: { lat: 21.1702, lng: 72.8311 },
  AHM: { lat: 23.0225, lng: 72.5714 },
  VAD: { lat: 22.3072, lng: 73.1812 },
  RAJ: { lat: 22.3039, lng: 70.8022 }
};

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Donor registration form state
  const [regForm, setRegForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '2000-01-01',
    gender: 'M',
    blood_group: 'O+',
    weight_kg: 60,
    region_code: 'SUR',
    address: '',
    latitude: 21.1702,
    longitude: 72.8311
  });
  const [regLoading, setRegLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(email, password);
      toast.success(`Welcome back, ${userData?.full_name || 'User'}!`, 'Authenticated');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials or account locked', 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);

    try {
      const payload = {
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password,
        full_name: regForm.full_name.trim(),
        date_of_birth: regForm.date_of_birth,
        gender: regForm.gender,
        blood_group: regForm.blood_group,
        weight_kg: Number(regForm.weight_kg),
        region_code: regForm.region_code,
        phone: regForm.phone.trim(),
        address: regForm.address.trim() || undefined,
        latitude: regForm.latitude ? Number(regForm.latitude) : undefined,
        longitude: regForm.longitude ? Number(regForm.longitude) : undefined
      };

      await authApi.registerDonor(payload);
      toast.success('Donor account registered successfully! Signing you in...', 'Registration Complete');

      // Auto login newly registered donor
      const userData = await login(payload.email, payload.password);
      toast.success(`Welcome to PulseNet, ${userData?.full_name || 'Donor'}!`, 'Signed In');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please check your details.', 'Registration Rejection');
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegionChange = (newRegion) => {
    const coords = REGION_COORDINATES[newRegion] || REGION_COORDINATES.SUR;
    setRegForm((prev) => ({
      ...prev,
      region_code: newRegion,
      latitude: coords.lat,
      longitude: coords.lng
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: mode === 'register' ? '580px' : '440px', transition: 'max-width 0.3s ease' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3a57e8 0%, #08b1ba 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(58, 87, 232, 0.3)',
            marginBottom: '14px'
          }}>
            <Droplet size={28} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            PulseNet BloodBank OS
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Unified Enterprise Medical & Donor Network
          </p>
        </div>

        {/* Card Container */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '32px',
          border: '1px solid var(--border-light)'
        }}>
          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                padding: '9px 14px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: mode === 'login' ? '#ffffff' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: mode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Lock size={15} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                padding: '9px 14px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: mode === 'register' ? '#ffffff' : 'transparent',
                color: mode === 'register' ? '#ec4899' : 'var(--text-muted)',
                boxShadow: mode === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <HeartHandshake size={15} />
              Donor Signup
            </button>
          </div>

          {/* ===================== MODE: SIGN IN ===================== */}
          {mode === 'login' && (
            <>
              <div style={{ marginBottom: '22px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                  Sign In to Workspace
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your credentials to access your designated system workspace
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Account Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.org or ' OR 1=1 --"
                      style={{
                        width: '100%',
                        padding: '11px 16px 11px 42px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f8f9fd'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '11px 16px 11px 42px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f8f9fd'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '13px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 20px rgba(58, 87, 232, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Authenticating Session...' : 'Sign In to Workspace'}
                </button>
              </form>

              {/* Callout to switch to Donor Signup */}
              <div style={{
                marginTop: '18px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                Want to donate blood and save lives?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ec4899',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Register as a Volunteer Donor →
                </button>
              </div>

              {/* Quick Demo Role Selector Pills */}
              <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Quick Fill Demo Role Credentials (Password: Test@1234)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Admin', email: 'admin@bb.test', color: '#3a57e8' },
                    { label: 'Officer', email: 'officer@bb.test', color: '#08b1ba' },
                    { label: 'Lab Tech', email: 'lab@bb.test', color: '#f59e0b' },
                    { label: 'Hospital', email: 'hospital@bb.test', color: '#10b981' },
                    { label: 'Donor', email: 'donor1@bb.test', color: '#ec4899' },
                    { label: 'Auditor', email: 'auditor@bb.test', color: '#8b5cf6' }
                  ].map(r => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => {
                        setEmail(r.email);
                        setPassword('Test@1234');
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: '#f8f9fd',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: r.color,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===================== MODE: DONOR SIGNUP ===================== */}
          {mode === 'register' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fdf2f8', color: '#ec4899', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>
                  <HeartHandshake size={13} />
                  Self-Registration Under Least Privilege
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                  Volunteer Donor Registration
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your medical profile to register as a voluntary donor and respond to emergency blood calls.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Full Name & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.full_name}
                      onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="donor@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                {/* Password & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Password * (min 6)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Mobile Phone * (10-digit)
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="^[6-9]\d{9}$"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="9876543210"
                      title="10-digit Indian mobile number starting with 6-9"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                {/* Date of Birth & Gender */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Date of Birth * (18–65 yrs)
                    </label>
                    <input
                      type="date"
                      required
                      value={regForm.date_of_birth}
                      onChange={(e) => setRegForm({ ...regForm, date_of_birth: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Biological Gender *
                    </label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="O">Other (O)</option>
                    </select>
                  </div>
                </div>

                {/* Blood Group, Weight, Region */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Blood Group *
                    </label>
                    <select
                      value={regForm.blood_group}
                      onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: 'var(--primary)'
                      }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min={45}
                      step={0.5}
                      value={regForm.weight_kg}
                      onChange={(e) => setRegForm({ ...regForm, weight_kg: Number(e.target.value) })}
                      placeholder="min 45kg"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      Region Zone *
                    </label>
                    <select
                      value={regForm.region_code}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="SUR">Surat (SUR)</option>
                      <option value="AHM">Ahmedabad (AHM)</option>
                      <option value="VAD">Vadodara (VAD)</option>
                      <option value="RAJ">Rajkot (RAJ)</option>
                    </select>
                  </div>
                </div>

                {/* Residential Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Residential Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    placeholder="e.g. 104 Anand Mahal Road, Surat"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                {/* Security and Privacy Notice */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  color: '#64748b',
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: '#334155' }}>Cryptographic Privacy Notice:</strong> Phone, email, and address are encrypted in PostgreSQL using <code>pgcrypto</code> (AES-256 sym). Blood bank staff cannot view raw contact details without an explicit audited decrypt operation.
                </div>

                {/* Submit Registration Button */}
                <button
                  type="submit"
                  disabled={regLoading}
                  style={{
                    marginTop: '6px',
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#ec4899',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: regLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 20px rgba(236, 72, 153, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: regLoading ? 0.7 : 1
                  }}
                >
                  {regLoading ? 'Registering Donor Profile...' : 'Complete Registration & Sign In'}
                </button>
              </form>

              {/* Back to Sign In Link */}
              <div style={{
                marginTop: '16px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            </>
          )}

          {/* Security Banner */}
          <div style={{
            marginTop: '24px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ShieldCheck size={20} color="#3a57e8" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
              Protected by PostgreSQL Row-Level Security (RLS) & Multi-Level Clearance Policies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
