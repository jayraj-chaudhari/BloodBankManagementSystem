import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertOctagon, RefreshCw, KeyRound } from 'lucide-react';
import { auditApi } from '../services/api';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [anomalies, setAnomalies] = useState(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const [logRes, anomalyRes] = await Promise.all([
        auditApi.getLogs({ limit: 30 }),
        auditApi.getAnomalies()
      ]);
      setLogs(logRes.data || []);
      setAnomalies(anomalyRes.data || null);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await auditApi.verifyChain();
      setVerifyResult({
        success: true,
        message: res.data.status,
        count: res.data.total_entries_verified,
        latestHash: res.data.latest_hash
      });
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err.message || 'Audit trail cryptographic chain verification failed!'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            Tamper-Evident MongoDB Audit Trail
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Append-only cryptographic SHA-256 hash chaining protecting clinical and PII governance
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--secondary)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '13px'
          }}
        >
          <KeyRound size={16} />
          {verifying ? 'Recomputing Chain...' : 'Verify Cryptographic Integrity'}
        </button>
      </div>

      {verifyResult && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: verifyResult.success ? '#e8f5ec' : '#fbebee',
          color: verifyResult.success ? 'var(--success)' : 'var(--danger)',
          marginBottom: '24px',
          borderLeft: `4px solid ${verifyResult.success ? 'var(--success)' : 'var(--danger)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '14px' }}>
            {verifyResult.success ? <CheckCircle2 size={20} /> : <AlertOctagon size={20} />}
            <span>{verifyResult.message}</span>
          </div>
          {verifyResult.success && (
            <div style={{ fontSize: '12px', marginTop: '6px', fontFamily: 'monospace', opacity: 0.9 }}>
              Verified {verifyResult.count} sequential blocks. Latest Hash: {verifyResult.latestHash}
            </div>
          )}
        </div>
      )}

      {/* Anomalies alert banner if suspicious activity detected */}
      {anomalies && anomalies.suspicious_login_attempts?.length > 0 && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffaf8', border: '1px solid #fbd6c6', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} />
            <span>Audit Anomaly Detected: Multiple Failed Logins from Same IP</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px' }}>
            IPs flagged: {anomalies.suspicious_login_attempts.map(a => `${a._id} (${a.count} attempts)`).join(', ')}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px' }}>Seq #</th>
              <th style={{ padding: '10px 14px' }}>Timestamp</th>
              <th style={{ padding: '10px 14px' }}>Action</th>
              <th style={{ padding: '10px 14px' }}>User / Role</th>
              <th style={{ padding: '10px 14px' }}>Resource</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}>SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading audit records from MongoDB...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No audit events logged yet</td></tr>
            ) : (
              logs.map((log) => {
                const isFail = !log.success || log.action === 'LOGIN_FAILED' || log.action === 'ACCESS_DENIED';
                return (
                  <tr key={log.seq} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--primary)', fontFamily: 'monospace' }}>
                      #{log.seq}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {new Date(log.ts).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: isFail ? '#fbebee' : '#f0f3fe',
                        color: isFail ? 'var(--danger)' : 'var(--primary)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {log.role} (User #{log.user_id || 'Anon'})
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {log.resource} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: '700', color: log.success ? 'var(--success)' : 'var(--danger)' }}>
                        {log.success ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {log.hash ? log.hash.substring(0, 16) + '...' : 'GENESIS'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
