import React from 'react';
import { Droplet, ShieldCheck, Heart } from 'lucide-react';

export default function DonorCardPreview({
  cardHolder = 'Demo Staff',
  bloodGroup = 'O-',
  idNumber = 'SUR-20261024-001',
  clearance = 2,
  status = 'Active Verified'
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Glassmorphic Clinical Card matching screenshot */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3bb3 0%, #3a57e8 50%, #08b1ba 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(58, 87, 232, 0.25)'
      }}>
        {/* Subtle glass effect overlay */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          filter: 'blur(2px)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', opacity: 0.85 }}>
              PULSENET HEALTH CARD
            </div>
            <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.9 }}>
              Clinical Classification Level {clearance}
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            <Droplet size={14} fill="#ffffff" />
            <span>{bloodGroup}</span>
          </div>
        </div>

        <div style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '3px', marginBottom: '24px', fontFamily: 'monospace' }}>
          {idNumber}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.75, letterSpacing: '0.5px' }}>
              Cardholder / Donor
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              {cardHolder}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.75, letterSpacing: '0.5px' }}>
              Status
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} />
              {status}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats below card matching screenshot layout */}
      <div className="hope-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eaf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Heart size={20} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>100%</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Screening Protocol</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e6f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>3-NF</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ACID Database</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>MAC Clearance:</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>
            Level {clearance} Active
          </span>
        </div>
      </div>
    </div>
  );
}
