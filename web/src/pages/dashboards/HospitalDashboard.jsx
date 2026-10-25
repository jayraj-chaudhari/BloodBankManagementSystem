import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  PackageCheck,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  TrendingUp,
  XCircle
} from 'lucide-react';
import HeroBanner from '../../components/common/HeroBanner';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { requestApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [publicInventory, setPublicInventory] = useState([]);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Requisition Form
  const [orderForm, setOrderForm] = useState({
    patient_ref: `PT-${Math.floor(10000 + Math.random() * 90000)}`,
    blood_group: 'O+',
    component: 'RED_CELLS',
    units_needed: 2,
    urgency: 'ROUTINE',
    needed_by: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
  });

  const loadHospitalData = async () => {
    try {
      setLoading(true);
      // Fetch this hospital's requests (RLS tenant-enforced)
      const reqRes = await requestApi.getRequests({ limit: 15 });
      setRequests(reqRes.data || []);

      // Fetch public stock view
      const invRes = await inventoryApi.getPublicInventory();
      setPublicInventory(invRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load hospital requisition portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await requestApi.createRequest({
        ...orderForm,
        units_needed: Number(orderForm.units_needed),
        needed_by: new Date(orderForm.needed_by).toISOString()
      });
      toast.success(`Blood requisition for ${orderForm.patient_ref} created successfully!`, 'Order Submitted');
      setShowNewOrderModal(false);
      loadHospitalData();
    } catch (err) {
      toast.error(err.message || 'Requisition creation failed', 'Order Rejected');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (requestId) => {
    if (!window.confirm('Cancel this blood requisition?')) return;
    try {
      await requestApi.cancelRequest(requestId);
      toast.success(`Request #${requestId} has been cancelled`, 'Requisition Cancelled');
      loadHospitalData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel request');
    }
  };

  // Stats calculation
  const totalOrders = requests.length;
  const pendingOrders = requests.filter(r => r.status === 'PENDING').length;
  const fulfilledOrders = requests.filter(r => r.status === 'FULFILLED' || r.status === 'ALLOCATED').length;
  const totalStockAvailable = publicInventory.reduce((acc, row) => acc + (row.units_available || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hospital Banner */}
      <HeroBanner
        title={`Hospital Portal: Requisition Desk`}
        subtitle="Submit urgent and routine patient blood requisitions with real-time FEFO allocation and tenant-isolated clinical tracking."
        badgeText="RLS Tenant Isolation: Hospital Scope"
        actions={[
          {
            label: 'New Blood Requisition',
            icon: Plus,
            variant: 'primary',
            onClick: () => setShowNewOrderModal(true)
          }
        ]}
      />

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={FileSpreadsheet}
          label="Total Requisitions"
          value={totalOrders}
          badgeText="Hospital Lifetime"
          color="#3a57e8"
        />
        <StatCard
          icon={Clock}
          label="Pending Queue"
          value={pendingOrders}
          badgeText="Awaiting Staff"
          color="#f59e0b"
        />
        <StatCard
          icon={CheckCircle2}
          label="Fulfilled Orders"
          value={fulfilledOrders}
          badgeText="Units Dispatched"
          color="#10b981"
        />
        <StatCard
          icon={PackageCheck}
          label="Network Stock Available"
          value={totalStockAvailable}
          badgeText="Public Branches"
          color="#08b1ba"
        />
      </div>

      {/* Main Grid: My Requisitions & Public Network Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Requisitions Table */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Active Patient Blood Requisitions
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Directly synchronized with PostgreSQL RLS policy (Hospital User Scope)
              </div>
            </div>
            <button
              onClick={() => setShowNewOrderModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Order Blood
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading requisition records...
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No active blood orders found for your hospital. Click "Order Blood" to submit your first requisition.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px' }}>Patient Ref</th>
                    <th style={{ padding: '12px 8px' }}>Group</th>
                    <th style={{ padding: '12px 8px' }}>Component</th>
                    <th style={{ padding: '12px 8px' }}>Units</th>
                    <th style={{ padding: '12px 8px' }}>Urgency</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const isEmergency = r.urgency === 'EMERGENCY';
                    const isPending = r.status === 'PENDING';

                    return (
                      <tr key={r.request_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '700' }}>{r.patient_ref}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            fontWeight: '800',
                            fontSize: '12px'
                          }}>
                            {r.blood_group}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#475569', fontWeight: '600' }}>{r.component}</td>
                        <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                          {r.units_allocated || 0} / {r.units_needed}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: isEmergency ? '#fee2e2' : '#f1f5f9',
                            color: isEmergency ? '#b91c1c' : '#475569',
                            fontWeight: '700',
                            fontSize: '11px'
                          }}>
                            {r.urgency}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'CANCELLED' ? '#f3f4f6' : '#fef3c7',
                            color: r.status === 'APPROVED' ? '#15803d' : r.status === 'CANCELLED' ? '#6b7280' : '#b45309',
                            fontWeight: '700',
                            fontSize: '11px'
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {isPending && (
                            <button
                              onClick={() => handleCancelOrder(r.request_id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fff',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Public Inventory Snapshot */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Public Blood Stock
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Viewable unexpired AVAILABLE units across regional hubs
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
            {publicInventory.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Stock records refreshing...
              </div>
            ) : (
              publicInventory.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '13px' }}>
                        {row.blood_group}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {row.component}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {row.branch_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: row.units_available > 0 ? '#10b981' : '#ef4444'
                  }}>
                    {row.units_available} bags
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Requisition Modal */}
      {showNewOrderModal && (
        <Modal
          title="Create Patient Blood Requisition"
          onClose={() => setShowNewOrderModal(false)}
        >
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                Patient Case Reference
              </label>
              <input
                type="text"
                required
                value={orderForm.patient_ref}
                onChange={(e) => setOrderForm({ ...orderForm, patient_ref: e.target.value })}
                placeholder="e.g. PT-89102"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Target Blood Group
                </label>
                <select
                  value={orderForm.blood_group}
                  onChange={(e) => setOrderForm({ ...orderForm, blood_group: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Component Required
                </label>
                <select
                  value={orderForm.component}
                  onChange={(e) => setOrderForm({ ...orderForm, component: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="RED_CELLS">Red Blood Cells (PRBC)</option>
                  <option value="WHOLE_BLOOD">Whole Blood</option>
                  <option value="PLASMA">Fresh Frozen Plasma</option>
                  <option value="PLATELETS">Platelets</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Units Needed
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={orderForm.units_needed}
                  onChange={(e) => setOrderForm({ ...orderForm, units_needed: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  Urgency Level
                </label>
                <select
                  value={orderForm.urgency}
                  onChange={(e) => setOrderForm({ ...orderForm, urgency: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="ROUTINE">Routine (Scheduled Surgery)</option>
                  <option value="URGENT">Urgent (Within 6 Hours)</option>
                  <option value="EMERGENCY">Emergency (STAT Immediate)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                Required Needed By Date/Time
              </label>
              <input
                type="datetime-local"
                value={orderForm.needed_by}
                onChange={(e) => setOrderForm({ ...orderForm, needed_by: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Dispatch Requisition'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
