import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Microscope,
  PackageCheck,
  FileSpreadsheet,
  Radio,
  BarChart3,
  ShieldAlert,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen = true, onToggle }) {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Clinical Operations',
      items: [
        { name: 'Donor Registry', path: '/donors', icon: Users, roles: ['bb_officer', 'admin', 'lab_tech', 'donor'] },
        { name: 'Donations Intake', path: '/donations', icon: HeartHandshake, roles: ['bb_officer', 'admin', 'donor'] },
        { name: 'Lab Screenings', path: '/screenings', icon: Microscope, roles: ['lab_tech', 'admin', 'auditor', 'donor'] }
      ]
    },
    {
      title: 'Logistics & Requisitions',
      items: [
        { name: 'Blood Inventory', path: '/inventory', icon: PackageCheck },
        { name: 'Hospital Requests', path: '/requests', icon: FileSpreadsheet, roles: ['bb_officer', 'admin', 'hospital_user', 'auditor'] },
        { name: 'Emergency Alerts', path: '/alerts', icon: Radio, roles: ['bb_officer', 'admin', 'donor'] }
      ]
    },
    {
      title: 'Governance & Analytics',
      items: [
        { name: 'SQL Analytics', path: '/analytics', icon: BarChart3, roles: ['bb_officer', 'admin', 'auditor', 'lab_tech'] },
        { name: 'Audit Hash Chain', path: '/audit', icon: ShieldAlert, roles: ['auditor', 'admin'] }
      ]
    }
  ];

  return (
    <aside style={{
      width: isOpen ? '260px' : '80px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100,
      userSelect: 'none'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo Mark matching Hope UI icon shape */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3a57e8 0%, #08b1ba 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(58, 87, 232, 0.3)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>

          {isOpen && (
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                PulseNet
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                BloodBank OS
              </div>
            </div>
          )}
        </div>

        {onToggle && isOpen && (
          <button
            onClick={onToggle}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#f5f6fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navGroups.map((group, gIdx) => {
          // Filter items by user role if specified
          const visibleItems = group.items.filter(
            (item) => !item.roles || !user || item.roles.includes(user.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} style={{ marginBottom: '20px' }}>
              {isOpen && (
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '4px 12px 8px 12px'
                }}>
                  {group.title}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {visibleItems.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: isActive ? '700' : '500',
                        backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        boxShadow: isActive ? '0 8px 20px rgba(58, 87, 232, 0.25)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={18} color={isActive ? '#ffffff' : 'currentColor'} />
                      {isOpen && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Indicator Footer */}
      {isOpen && user && (
        <div style={{
          padding: '16px',
          margin: '12px',
          backgroundColor: '#f8f9fd',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Current Session
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
            {user.full_name}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: '700' }}>
              {user.role}
            </span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e6f7f8', color: 'var(--secondary)', fontWeight: '700' }}>
              MAC L{user.clearance}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
