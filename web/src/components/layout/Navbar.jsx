import React, { useState } from 'react';
import { Search, Bell, Radio, User, LogOut, ChevronDown, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Navbar({ onSearch }) {
  const { user, logout } = useAuth();
  const { isConnected, liveAlerts, clearAlerts } = useSocket();
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'admin': return 'System Administrator';
      case 'bb_officer': return 'Blood Bank Officer';
      case 'lab_tech': return 'Laboratory Specialist';
      case 'hospital_user': return 'Hospital Requisition Desk';
      case 'donor': return 'Registered Blood Donor';
      case 'auditor': return 'Independent Auditor';
      default: return r || 'Authenticated User';
    }
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
      {/* Search Input */}
      <div style={{
        position: 'relative',
        width: '380px'
      }}>
        <Search
          size={18}
          color="var(--text-muted)"
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search donors, bags, tests, requisitions..."
          style={{
            width: '100%',
            padding: '10px 16px 10px 42px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            backgroundColor: '#f8f9fd',
            fontSize: '13px',
            color: 'var(--text-main)',
            outline: 'none',
            transition: 'border-color 0.2s ease, background-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.backgroundColor = '#ffffff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-light)';
            e.target.style.backgroundColor = '#f8f9fd';
          }}
        />
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Real-Time Socket Connection Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: isConnected ? '#e6f7f0' : '#fee2e2',
          border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
          fontSize: '12px',
          fontWeight: '600',
          color: isConnected ? '#059669' : '#b91c1c'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10b981' : '#ef4444',
            display: 'inline-block',
            boxShadow: isConnected ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none'
          }} />
          {isConnected ? 'PulseNet Live' : 'Reconnecting...'}
        </div>

        {/* Live Notification Bell with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: showAlertMenu ? 'var(--primary-light)' : '#f8f9fd',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showAlertMenu ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <Bell size={18} />
            {liveAlerts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: 'var(--danger)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #ffffff'
              }}>
                {liveAlerts.length}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '52px',
              width: '360px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-light)',
              padding: '16px',
              zIndex: 200
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-light)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Live Dispatch Feed
                </div>
                {liveAlerts.length > 0 && (
                  <button
                    onClick={clearAlerts}
                    style={{
                      fontSize: '11px',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {liveAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <ShieldCheck size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  All emergency dispatches are normal. Socket telemetry active.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {liveAlerts.map((al, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#fff7ed',
                        borderLeft: '3px solid #f97316',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#c2410c' }}>
                          CRITICAL DEMAND
                        </span>
                        <span style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>
                          {al.distance_km ? `${al.distance_km} km` : 'Active'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                        Group {al.blood_group} ({al.component || 'Whole Blood'})
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {al.hospital_name || 'Emergency Unit'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Account & Logout Control */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 12px 6px 8px',
              backgroundColor: '#f8f9fd',
              borderRadius: '24px',
              border: '1px solid var(--border-light)',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3bb3 0%, #3a57e8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px'
            }}>
              {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)' }}>
                {getRoleDisplayName(user?.role)}
              </div>
            </div>

            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '54px',
              width: '260px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-light)',
              padding: '8px',
              zIndex: 200
            }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Signed in as</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email || user?.full_name}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4338ca', fontWeight: '700' }}>
                    {user?.role}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: '700' }}>
                    RLS Level {user?.clearance}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <LogOut size={16} />
                <span>Log Out of Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
