import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Droplet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            marginBottom: '16px'
          }}>
            <Droplet size={28} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            PulseNet BloodBank OS
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Unified Enterprise Medical Portal
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '36px',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Sign In
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Enter your clinical credentials to access your designated workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                Account Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8f9fd'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
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
                    padding: '12px 16px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f8f9fd'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '14px',
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

          {/* Quick Demo Role Selector Pills */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
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

          {/* Security Banner */}
          <div style={{
            marginTop: '28px',
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
