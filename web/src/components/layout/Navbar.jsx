import React, { useState } from 'react';
import { Search, Bell, Radio, User, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Demo quick-login roles defined in project specification
const DEMO_ROLES = [
  { role: 'bb_officer', name: 'Officer Asha', email: 'officer@bb.test', clearance: 2 },
  { role: 'admin', name: 'Admin Patel', email: 'admin@bb.test', clearance: 2 },
  { role: 'lab_tech', name: 'Lab Tech Raman', email: 'lab@bb.test', clearance: 3 },
  { role: 'hospital_user', name: 'City Hospital', email: 'hospital@bb.test', clearance: 1 },
  { role: 'donor', name: 'Donor Rajesh', email: 'donor1@bb.test', clearance: 1 },
  { role: 'auditor', name: 'Auditor Mehta', email: 'auditor@bb.test', clearance: 2 }
];

export default function Navbar({ onSearch }) {
  const { user, login, logout } = useAuth();
  const { isConnected, liveAlerts, clearAlerts } = useSocket();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleQuickSwitch = async (demo) => {
    try {
      await login(demo.email, 'Test@1234');
      setShowRoleMenu(false);
    } catch (e) {
      console.error('Quick switch failed:', e);
    }
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header style={{
      height: '74px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light)',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* Search Input matching Hope UI search box */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#f5f6fa',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        width: '320px',
        border: '1px solid var(--border)'
      }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search blood bags, donors, requests..."
          value={searchValue}
          onChange={handleSearchChange}
          style={{
            border: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: '13px',
            color: 'var(--text-main)'
          }}
        />
      </div>

      {/* Right Navbar Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Real-time Socket.IO Live Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: isConnected ? '#e8f5ec' : '#fbebee',
          color: isConnected ? 'var(--success)' : 'var(--danger)',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          <span className="pulse-dot" style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }} />
          <span>{isConnected ? 'Real-Time Live' : 'Disconnected'}</span>
        </div>

        {/* Emergency Alerts Bell Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f5f6fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
              position: 'relative'
            }}
          >
            <Bell size={18} />
            {liveAlerts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)'
              }} />
            )}
          </button>

          {showAlertMenu && (
            <div className="hope-card" style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              padding: '16px',
              zIndex: 100
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Emergency Alerts ({liveAlerts.length})</span>
                {liveAlerts.length > 0 && (
                  <button onClick={clearAlerts} style={{ fontSize: '11px', color: 'var(--primary)', background: 'none', fontWeight: '600' }}>
                    Clear all
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {liveAlerts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No active emergency alerts
                  </div>
                ) : (
                  liveAlerts.map((alt, idx) => (
                    <div key={idx} style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: '#fbebee',
                      marginBottom: '8px',
                      borderLeft: '3px solid var(--danger)'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>
                        URGENT: {alt.blood_group} ({alt.component})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-main)' }}>
                        {alt.hospital_name || 'Emergency Requisition'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo Role Switcher Quick Pill */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: '700'
            }}
          >
            <span>Role Switcher</span>
            <ChevronDown size={14} />
          </button>

          {showRoleMenu && (
            <div className="hope-card" style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              width: '240px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              padding: '8px',
              zIndex: 100
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', padding: '6px 10px' }}>
                SWITCH ACTIVE ROLE (DEMO)
              </div>
              {DEMO_ROLES.map((demo, idx) => (
                <div
                  key={idx}
                  onClick={() => handleQuickSwitch(demo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: user?.role === demo.role ? '700' : '500',
                    backgroundColor: user?.role === demo.role ? 'var(--primary-light)' : 'transparent',
                    color: user?.role === demo.role ? 'var(--primary)' : 'var(--text-main)'
                  }}
                >
                  <div>
                    <div>{demo.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{demo.role} • L{demo.clearance}</div>
                  </div>
                  {user?.role === demo.role && <CheckCircle2 size={16} color="var(--primary)" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile matching Hope UI screenshot avatar */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#1e3bb3',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '15px'
            }}>
              {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {user.full_name || 'Staff User'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user.role} (L{user.clearance})
              </span>
            </div>

            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700'
            }}
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
}
