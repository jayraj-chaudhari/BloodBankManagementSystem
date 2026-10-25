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
  ChevronLeft,
  Building2,
  Activity,
  History,
  Send,
  Droplet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen = true, onToggle }) {
  const { user } = useAuth();
  const location = useLocation();

  // Return distinct navigation items curated specifically per user role
  const getNavSections = () => {
    const role = user?.role;

    // 1. HOSPITAL USER: Requisitions, Hospital Inventory, Live Stock, Tracking
    if (role === 'hospital_user') {
      return [
        {
          title: 'Hospital Portal',
          items: [
            { name: 'Hospital Dashboard', path: '/', icon: LayoutDashboard },
            { name: 'Blood Requisitions', path: '/requests', icon: FileSpreadsheet },
            { name: 'Public Stock View', path: '/inventory', icon: PackageCheck }
          ]
        }
      ];
    }

    // 2. REGISTERED DONOR: Donor Profile, Eligibility, Donation History, Screening Results, Emergency Calls
    if (role === 'donor') {
      return [
        {
          title: 'Donor Portal',
          items: [
            { name: 'Donor Dashboard', path: '/', icon: LayoutDashboard },
            { name: 'My Donations', path: '/donations', icon: HeartHandshake },
            { name: 'Lab Reports', path: '/screenings', icon: Microscope },
            { name: 'Emergency Alerts', path: '/alerts', icon: Radio }
          ]
        }
      ];
    }

    // 3. LAB TECHNICIAN: Testing Queue, Screening Protocols, Discard / Release, Quality Metrics
    if (role === 'lab_tech') {
      return [
        {
          title: 'Laboratory Hub',
          items: [
            { name: 'Lab Dashboard', path: '/', icon: LayoutDashboard },
            { name: 'Screening Bench', path: '/screenings', icon: Microscope },
            { name: 'Tested Units', path: '/inventory', icon: PackageCheck },
            { name: 'Positivity Analytics', path: '/analytics', icon: BarChart3 }
          ]
        }
      ];
    }

    // 4. AUDITOR: Compliance, Append-Only Hash Chain, Regulatory Audits, Stock Ledger
    if (role === 'auditor') {
      return [
        {
          title: 'Auditor & Compliance',
          items: [
            { name: 'Compliance Overview', path: '/', icon: LayoutDashboard },
            { name: 'Audit Hash Chain', path: '/audit', icon: ShieldAlert },
            { name: 'Stock Movement Ledger', path: '/inventory', icon: PackageCheck },
            { name: 'Analytical Reports', path: '/analytics', icon: BarChart3 }
          ]
        }
      ];
    }

    // 5. BLOOD BANK OFFICER: Donor Intake, Donation Capture, FEFO Allocation, Dispatch, Alerts
    if (role === 'bb_officer') {
      return [
        {
          title: 'Officer Operations',
          items: [
            { name: 'Operations Center', path: '/', icon: LayoutDashboard },
            { name: 'Donor Registry', path: '/donors', icon: Users },
            { name: 'Donation Intake', path: '/donations', icon: HeartHandshake },
            { name: 'Blood Bank Inventory', path: '/inventory', icon: PackageCheck },
            { name: 'Hospital Orders', path: '/requests', icon: FileSpreadsheet },
            { name: 'Dispatch Alerts', path: '/alerts', icon: Radio },
            { name: 'Operational Trends', path: '/analytics', icon: BarChart3 }
          ]
        }
      ];
    }

    // 6. SYSTEM ADMINISTRATOR (default/admin): Full System Control
    return [
      {
        title: 'Administration',
        items: [
          { name: 'Executive Overview', path: '/', icon: LayoutDashboard },
          { name: 'Donor Registry', path: '/donors', icon: Users },
          { name: 'Donations Intake', path: '/donations', icon: HeartHandshake },
          { name: 'Laboratory Testing', path: '/screenings', icon: Microscope },
          { name: 'Inventory & Cold-Chain', path: '/inventory', icon: PackageCheck },
          { name: 'Requisitions Desk', path: '/requests', icon: FileSpreadsheet },
          { name: 'Emergency Alerts', path: '/alerts', icon: Radio },
          { name: 'Governance & Analytics', path: '/analytics', icon: BarChart3 },
          { name: 'Cryptographic Audit', path: '/audit', icon: ShieldAlert }
        ]
      }
    ];
  };

  const navSections = getNavSections();

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
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3a57e8 0%, #08b1ba 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(58, 87, 232, 0.3)'
          }}>
            <Droplet size={22} fill="currentColor" />
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
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx} style={{ marginBottom: '20px' }}>
            {isOpen && (
              <div style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '4px 12px 8px 12px'
              }}>
                {section.title}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={iIdx}
                    to={item.path}
                    title={!isOpen ? item.name : undefined}
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
                      transition: 'all 0.15s ease',
                      textDecoration: 'none'
                    }}
                  >
                    <Icon size={18} color={isActive ? '#ffffff' : 'currentColor'} style={{ flexShrink: 0 }} />
                    {isOpen && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Role Profile Badge Footer */}
      {isOpen && user && (
        <div style={{
          padding: '14px 16px',
          margin: '12px',
          backgroundColor: '#f8f9fd',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Authenticated Role
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
