import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Hash,
  Database,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  RefreshCw,
  Search
} from 'lucide-react';
import HeroBanner from '../../components/common/HeroBanner';
import StatCard from '../../components/common/StatCard';
import { auditApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AuditorDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [filterAction, setFilterAction] = useState('ALL');

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const res = await auditApi.getLogs({ limit: 25 });
      setLogs(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load MongoDB audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await auditApi.verifyChain();
      setIntegrityStatus(res.data);
      if (res.data?.valid) {
        toast.success(
          `SHA-256 chain verified: ${res.data.verified_records || 0} sequential blocks intact with zero tamper detected.`,
          'Cryptographic Verification Passed'
        );
      } else {
        toast.error(
          `Integrity anomaly detected at sequence #${res.data?.broken_at || 'unknown'}`,
          'Tamper Detected'
        );
      }
    } catch (err) {
      toast.error(err.message || 'Chain verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = filterAction === 'ALL'
    ? logs
    : logs.filter(l => l.action === filterAction);

  const piiViews = logs.filter(l => l.action?.includes('PII') || l.action?.includes('CONTACT')).length;
  const securityEvents = logs.filter(l => l.action?.includes('LOGIN') || l.status === 'FAILURE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Auditor Banner */}
      <HeroBanner
        title="Auditor & Cryptographic Governance"
        subtitle="Independent audit overview backed by MongoDB SHA-256 append-only hash chains, strict RLS query bounds, and stock movement ledger."
        badgeText="Statutory Compliance: Zero Direct Table Access (Audit Role)"
        actions={[
          {
            label: verifying ? 'Verifying Hashes...' : 'Verify Hash Chain Integrity',
            icon: RefreshCw,
            variant: 'primary',
            onClick: handleVerifyChain
          }
        ]}
      />

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={Hash}
          label="Chained Audit Blocks"
          value={logs.length}
          badgeText="Append-Only Trail"
          color="#3a57e8"
        />
        <StatCard
          icon={CheckCircle2}
          label="Chain Integrity"
          value={integrityStatus ? (integrityStatus.valid ? '100% Intact' : 'TAMPERED') : 'Ready to Verify'}
          badgeText={integrityStatus?.valid ? 'SHA-256 Matched' : 'Click Verify'}
          color={integrityStatus?.valid ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          icon={ShieldAlert}
          label="PII Decryption Events"
          value={piiViews}
          badgeText="Audited Access"
          color="#08b1ba"
        />
        <StatCard
          icon={History}
          label="Security Audits"
          value={securityEvents}
          badgeText="Auth & Operations"
          color="#ef4444"
        />
      </div>

      {/* Audit Log Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Cryptographic Audit Chain (MongoDB)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Each record contains the SHA-256 hash of its predecessor, creating a tamper-evident chain
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'LOGIN_SUCCESS', 'PII_VIEWED', 'DONATION_RECORDED', 'UNIT_ALLOCATED'].map(action => (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: filterAction === action ? 'var(--primary)' : '#ffffff',
                  color: filterAction === action ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Retrieving blockchain audit nodes from MongoDB...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No audit records match the current filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Seq #</th>
                  <th style={{ padding: '10px 8px' }}>Timestamp</th>
                  <th style={{ padding: '10px 8px' }}>Action</th>
                  <th style={{ padding: '10px 8px' }}>Table / Target</th>
                  <th style={{ padding: '10px 8px' }}>User Context</th>
                  <th style={{ padding: '10px 8px' }}>SHA-256 Block Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 8px', fontWeight: '800', color: 'var(--primary)' }}>
                      #{log.sequence || idx + 1}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#64748b' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: log.action?.includes('PII') ? '#fef3c7' : '#eef2ff',
                        color: log.action?.includes('PII') ? '#b45309' : '#4338ca',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: '600', color: '#334155' }}>
                      {log.entity || 'system'} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#475569' }}>
                      User #{log.user_id || 'sys'} | IP: {log.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#047857', fontSize: '11px' }}>
                      {log.hash ? `${log.hash.substring(0, 16)}...` : 'genesis_block'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
