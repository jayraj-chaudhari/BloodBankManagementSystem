import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  percent = 75,
  color = '#3a57e8',
  icon: Icon
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="hope-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Circular Progress Dial matching Hope UI screenshot */}
        <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="#eaedfd"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke={color}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon ? (
              <Icon size={18} color={color} />
            ) : (
              <span style={{ fontSize: '11px', fontWeight: '700', color: color }}>
                {percent}%
              </span>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {value}
          </div>
        </div>
      </div>

      {subtitle && (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          padding: '4px 10px',
          borderRadius: '20px',
          backgroundColor: '#f0f3fe',
          color: color
        }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
