import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Zap, FileCode, CheckCircle2, AlertTriangle, Filter, XCircle } from 'lucide-react';
import { requestApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/common/Modal';

export default function RequisitionsPage() {
  const { user } = useAuth();
  const { lastRequestEvent } = useSocket();
  const role = user?.role || user?.role_name;
  const isHospital = role === 'hospital_user';
  const canAllocate = ['bb_officer', 'admin'].includes(role);
  const canCreate = ['hospital_user', 'bb_officer', 'admin'].includes(role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    hospital_id: user?.hospital_id || 1,
    patient_ref: 'PT-' + Math.floor(10000 + Math.random() * 90000),
    blood_group: 'B+',
    component: 'RED_CELLS',
    units_needed: 2,
    urgency: 'URGENT',
    needed_by: new Date(Date.now() + 86400000).toISOString()
  });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (urgencyFilter) params.urgency = urgencyFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await requestApi.getRequests(params);
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [role, urgencyFilter, statusFilter, lastRequestEvent]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await requestApi.createRequest({
        ...form,
        hospital_id: isHospital ? Number(user?.hospital_id || form.hospital_id) : Number(form.hospital_id),
        units_needed: Number(form.units_needed)
      });
      setMessage({ type: 'success', text: 'Blood request registered in queue!' });
      setShowCreateModal(false);
      loadRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit blood request' });
    }
  };

  const handleAllocate = async (requestId) => {
    try {
      const res = await requestApi.allocateFEFO(requestId);
      setMessage({ type: 'success', text: `Allocated ${res.data.allocated_units} unit(s) via FEFO!` });
      loadRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'FEFO Allocation failed' });
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm(`Are you sure you want to cancel Requisition #${requestId}?`)) return;
    try {
      await requestApi.updateRequestStatus(requestId, 'CANCELLED');
      setMessage({ type: 'success', text: `Requisition #${requestId} has been cancelled.` });
      loadRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to cancel requisition' });
    }
  };

  const handleExportXml = (requestId) => {
    const token = localStorage.getItem('bb_token');
    const url = token ? `/api/v1/export/requests/${requestId}.xml?token=${encodeURIComponent(token)}` : `/api/v1/export/requests/${requestId}.xml`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            {isHospital ? 'Hospital Blood Orders & Requisitions' : 'Hospital Blood Requisitions'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isHospital
              ? 'Submit and track patient blood requests with live dispatch status updates'
              : 'Hospital demand tracking with automated First-Expiry-First-Out (FEFO) allocation'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '13px'
            }}
          >
            <Plus size={16} />
            {isHospital ? 'New Blood Requisition' : 'Create Requisition'}
          </button>
        )}
      </div>

      {message && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: message.type === 'success' ? '#e8f5ec' : '#fbebee',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          {message.text}
        </div>
      )}

      {/* Filter toolbar */}
      <div className="hope-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: '700' }}>Filters:</div>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
        >
          <option value="">All Urgency Levels</option>
          <option value="ROUTINE">ROUTINE</option>
          <option value="URGENT">URGENT</option>
          <option value="EMERGENCY">EMERGENCY</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="FULFILLED">FULFILLED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="hope-card" style={{ padding: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Req ID</th>
              <th style={{ padding: '12px 16px' }}>Hospital / Ref</th>
              <th style={{ padding: '12px 16px' }}>Group / Component</th>
              <th style={{ padding: '12px 16px' }}>Units</th>
              <th style={{ padding: '12px 16px' }}>Urgency</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No blood requisitions matching filters</td></tr>
            ) : (
              requests.map((r) => {
                const isPending = ['PENDING', 'APPROVED', 'PARTIAL'].includes(r.status);
                return (
                  <tr key={r.request_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)' }}>
                      #{r.request_id}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700' }}>{r.hospital_name || 'Hospital'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {r.patient_ref}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '800', color: 'var(--primary)', marginRight: '6px' }}>{r.blood_group}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{r.component.replace('_', ' ')}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700' }}>
                      {r.units_allocated || 0} / {r.units_needed}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: r.urgency === 'EMERGENCY' ? '#fbebee' : r.urgency === 'URGENT' ? '#fef0e8' : '#eaf4ff',
                        color: r.urgency === 'EMERGENCY' ? 'var(--danger)' : r.urgency === 'URGENT' ? 'var(--warning)' : 'var(--primary)'
                      }}>
                        {r.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: r.status === 'FULFILLED' ? '#e8f5ec' : isPending ? '#eaf4ff' : '#fbebee',
                        color: r.status === 'FULFILLED' ? 'var(--success)' : isPending ? 'var(--primary)' : 'var(--danger)'
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {canAllocate && isPending && (
                          <button
                            onClick={() => handleAllocate(r.request_id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}
                          >
                            <Zap size={13} />
                            FEFO
                          </button>
                        )}
                        {isHospital && isPending && (
                          <button
                            onClick={() => handleCancelRequest(r.request_id)}
                            title="Cancel Request"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              border: '1px solid #fecaca'
                            }}
                          >
                            <XCircle size={13} />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleExportXml(r.request_id)}
                          title="Export XML"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#f5f6fa',
                            color: 'var(--text-muted)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <FileCode size={13} />
                          XML
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Requisition Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Hospital Blood Requisition">
        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isHospital && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Hospital ID *</label>
              <input
                type="number"
                required
                value={form.hospital_id}
                onChange={(e) => setForm({ ...form, hospital_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Patient Ref (Pseudonymous) *</label>
              <input
                type="text"
                required
                value={form.patient_ref}
                onChange={(e) => setForm({ ...form, patient_ref: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Units Needed (1 - 20) *</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={form.units_needed}
                onChange={(e) => setForm({ ...form, units_needed: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Blood Group</label>
              <select
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Component</label>
              <select
                value={form.component}
                onChange={(e) => setForm({ ...form, component: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="RED_CELLS">RED CELLS</option>
                <option value="PLASMA">PLASMA</option>
                <option value="PLATELETS">PLATELETS</option>
                <option value="WHOLE_BLOOD">WHOLE BLOOD</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="ROUTINE">ROUTINE</option>
                <option value="URGENT">URGENT</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              marginTop: '10px'
            }}
          >
            Submit Blood Requisition
          </button>
        </form>
      </Modal>
    </div>
  );
}
