import React from 'react';
import { Volume2, PlusCircle, Activity, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function HeroBanner({
  title,
  titleExtra,
  subtitle,
  badgeText,
  actions,
  onRegisterDonor,
  onNewDonation,
  onFEFOAllocate
}) {
  const { user } = useAuth();
  const userName = user?.full_name || 'Medical Officer';
  const roleDisplay = user?.role ? user.role.toUpperCase().replace('_', ' ') : 'STAFF';

  return (
    <div style={{
      background: 'linear-gradient(105deg, #1e3bb3 0%, #3a57e8 55%, #08b1ba 100%)',
      borderRadius: 'var(--radius-lg)',
      padding: '34px 38px',
      color: '#ffffff',
      marginBottom: '26px',
      boxShadow: '0 15px 35px rgba(58, 87, 232, 0.2)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glow circles */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '220px',
        height: '220px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {title || `Hello, ${userName}!`}
            </h1>
            {titleExtra}
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}>
              {roleDisplay}
            </span>
          </div>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.88)', maxWidth: '640px', lineHeight: '1.6', margin: '0 0 18px 0' }}>
            {subtitle || 'PulseNet BloodBank OS is running live with PostgreSQL Row-Level Security and MongoDB Tamper-Evident Hash Chains.'}
          </p>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {actions && actions.length > 0 ? (
              actions.map((act, idx) => {
                const IconComp = act.icon;
                const isPrimary = act.variant === 'primary' || !act.variant;
                return (
                  <button
                    key={idx}
                    onClick={act.onClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: isPrimary ? '#ffffff' : 'rgba(255, 255, 255, 0.18)',
                      color: isPrimary ? 'var(--primary)' : '#ffffff',
                      fontWeight: '700',
                      fontSize: '13px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: isPrimary ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: isPrimary ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer'
                    }}
                  >
                    {IconComp && <IconComp size={16} />}
                    {act.label}
                  </button>
                );
              })
            ) : (
              <>
                {onRegisterDonor && (
                  <button
                    onClick={onRegisterDonor}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#ffffff',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      fontSize: '13px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <PlusCircle size={16} />
                    Register Donor
                  </button>
                )}

                {onNewDonation && (
                  <button
                    onClick={onNewDonation}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer'
                    }}
                  >
                    <Activity size={16} />
                    Record Donation
                  </button>
                )}

                {onFEFOAllocate && (
                  <button
                    onClick={onFEFOAllocate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer'
                    }}
                  >
                    <Zap size={16} />
                    FEFO Allocate
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Announcements Pill matching Hope UI screenshot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: '600',
          alignSelf: 'flex-start'
        }}>
          <Volume2 size={16} />
          <span>{badgeText || `RLS Enforced: MAC Level ${user?.clearance || 1}`}</span>
        </div>
      </div>
    </div>
  );
}
