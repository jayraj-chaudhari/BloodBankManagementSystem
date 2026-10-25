import React, { useState, useEffect } from 'react';
import { PackageCheck, Clock, AlertTriangle, ShieldCheck, RefreshCw, Filter, Layers } from 'lucide-react';
import { inventoryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function InventoryPage() {
  const { user } = useAuth();
  const { lastInventoryEvent } = useSocket();
  const role = user?.role || user?.role_name;
  const isHospital = role === 'hospital_user';
  const canModify = ['bb_officer', 'admin'].includes(role);

  const [units, setUnits] = useState([]);
  const [publicInventory, setPublicInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [expiringFilter, setExpiringFilter] = useState('');
  const [message, setMessage] = useState(null);

  const loadStock = async () => {
    try {
      setLoading(true);
      if (isHospital) {
        const pubRes = await inventoryApi.getPublicInventory();
        setPublicInventory(pubRes.data || []);
      } else {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (componentFilter) params.component = componentFilter;
        if (expiringFilter) params.expiring_within_days = expiringFilter;

        const [unitRes, pubRes] = await Promise.all([
          inventoryApi.getUnits(params),
          inventoryApi.getPublicInventory()
        ]);
        setUnits(unitRes.data || []);
        setPublicInventory(pubRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [role, statusFilter, componentFilter, expiringFilter, lastInventoryEvent]);

  const handleExpireSweep = async () => {
    try {
      const res = await inventoryApi.expireUnits();
      setMessage({ type: 'success', text: `Sweep complete: ${res.data.expired_units} past-expiry unit(s) marked EXPIRED.` });
      loadStock();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Expiry sweep failed' });
    }
  };

  const handleStatusChange = async (unitId, newStatus) => {
    try {
      await inventoryApi.updateUnitStatus(unitId, newStatus);
      setMessage({ type: 'success', text: `Unit #${unitId} status updated to ${newStatus}. Logged in partitioned stock_movement ledger.` });
      loadStock();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Status update failed' });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            {isHospital ? 'Regional Blood Stock Availability' : 'Blood Inventory & Cold-Chain Management'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isHospital
              ? 'Real-time verified inventory counts across all regional blood hubs'
              : 'Real-time stock ledger list-partitioned by region (SUR, AHM, VAD, RAJ)'}
          </p>
        </div>

        {canModify && (
          <button
            onClick={handleExpireSweep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fbebee',
              color: 'var(--danger)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '13px',
              border: '1px solid #f5c2c7'
            }}
          >
            <Clock size={16} />
            Run Expiry Sweep
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

      {/* Hospital Public Stock View */}
      {isHospital ? (
        <div className="hope-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Layers size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Available Verified Stock for Hospital Requisitions</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Blood Group</th>
                <th style={{ padding: '12px 16px' }}>Component</th>
                <th style={{ padding: '12px 16px' }}>Available Units</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>Loading public stock...</td></tr>
              ) : publicInventory.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No units currently available</td></tr>
              ) : (
                publicInventory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '800', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f0f3fe', color: 'var(--primary)' }}>
                        {item.blood_group}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                      {item.component.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '14px', color: item.units_available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {item.units_available} unit(s)
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: item.units_available > 0 ? '#e8f5ec' : '#fbebee',
                        color: item.units_available > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {item.units_available > 0 ? 'READY FOR ORDER' : 'DEPLETED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Filter toolbar for Staff */}
          <div className="hope-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Filters:</div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="QUARANTINE">QUARANTINE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="DISCARDED">DISCARDED</option>
            </select>

            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
            >
              <option value="">All Components</option>
              <option value="RED_CELLS">RED CELLS</option>
              <option value="PLASMA">PLASMA</option>
              <option value="PLATELETS">PLATELETS</option>
              <option value="WHOLE_BLOOD">WHOLE BLOOD</option>
            </select>

            <select
              value={expiringFilter}
              onChange={(e) => setExpiringFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
            >
              <option value="">Any Expiry Window</option>
              <option value="3">Expiring within 3 Days</option>
              <option value="7">Expiring within 7 Days</option>
              <option value="14">Expiring within 14 Days</option>
            </select>
          </div>

          {/* Units Table */}
          <div className="hope-card" style={{ padding: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Unit Code / Barcode</th>
                  <th style={{ padding: '12px 16px' }}>Group</th>
                  <th style={{ padding: '12px 16px' }}>Component</th>
                  <th style={{ padding: '12px 16px' }}>Branch</th>
                  <th style={{ padding: '12px 16px' }}>Volume</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Expires On</th>
                  {canModify && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canModify ? 8 : 7} style={{ textAlign: 'center', padding: '30px' }}>Loading blood units...</td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan={canModify ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No units found</td></tr>
                ) : (
                  units.map((u) => {
                    const isAvail = u.status === 'AVAILABLE';
                    const isQuarantine = u.status === 'QUARANTINE';

                    return (
                      <tr key={u.unit_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                          {u.unit_code}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f0f3fe', color: 'var(--primary)' }}>
                            {u.blood_group}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '500' }}>
                          {u.component.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                          {u.branch_name}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                          {u.volume_ml} mL
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: isAvail ? '#e8f5ec' : isQuarantine ? '#fef0e8' : '#fbebee',
                            color: isAvail ? 'var(--success)' : isQuarantine ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                          {new Date(u.expires_on).toLocaleDateString()}
                        </td>
                        {canModify && (
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <select
                              value={u.status}
                              onChange={(e) => handleStatusChange(u.unit_id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="RESERVED">RESERVED</option>
                              <option value="QUARANTINE">QUARANTINE</option>
                              <option value="DISCARDED">DISCARDED</option>
                              <option value="EXPIRED">EXPIRED</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
