import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Droplet, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QUICK_ROLES = [
  { role: 'Blood Bank Officer', email: 'officer@bb.test', clearance: 2, bg: '#3a57e8' },
  { role: 'System Admin', email: 'admin@bb.test', clearance: 2, bg: '#1e3bb3' },
  { role: 'Laboratory Tech', email: 'lab@bb.test', clearance: 3, bg: '#dc3545' },
  { role: 'Hospital Staff', email: 'hospital@bb.test', clearance: 1, bg: '#08b1ba' },
  { role: 'Registered Donor', email: 'donor1@bb.test', clearance: 1, bg: '#7a5af8' },
  { role: 'Auditor', email: 'auditor@bb.test', clearance: 2, bg: '#f16a1b' }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail) => {
    setError(null);
    setLoading(true);
    try {
      await login(userEmail, 'Test@1234');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Quick login failed');
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
            <Droplet size={28} fill="#ffffff" />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            PulseNet BloodBank OS
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            PostgreSQL Row-Level Security • MongoDB Audit Trail
          </p>
        </div>

        {/* Login Card */}
        <div className="hope-card" style={{ padding: '34px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#fbebee',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Email Address</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginTop: '6px'
              }}>
                <Mail size={16} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  placeholder="name@bb.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Password</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginTop: '6px'
              }}>
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
                marginTop: '8px',
                boxShadow: '0 4px 14px rgba(58, 87, 232, 0.3)'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Login Grid */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
              One-Click Role Authentication (Demo)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {QUICK_ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleQuickLogin(r.email)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fd',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    fontSize: '11px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontWeight: '700', color: r.bg }}>{r.role}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Clearance L{r.clearance}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
