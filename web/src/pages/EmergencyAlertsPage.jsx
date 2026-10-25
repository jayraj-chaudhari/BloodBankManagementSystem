import React, { useState, useEffect } from 'react';
import { Radio, Send, CheckCircle2, XCircle, MapPin, AlertTriangle, Users } from 'lucide-react';
import { alertApi, requestApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';

export default function EmergencyAlertsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const role = user?.role || user?.role_name;
  const isDonor = role === 'donor';

  const [donorAlerts, setDonorAlerts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [maxDonors, setMaxDonors] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isDonor) {
        const res = await alertApi.getAlertsMe();
        setDonorAlerts(res.data || []);
      } else {
        const reqRes = await requestApi.getRequests({ urgency: 'EMERGENCY' });
        const list = reqRes.data || [];
        setRequests(list);
        if (list.length > 0 && !selectedReqId) {
          setSelectedReqId(String(list[0].request_id));
        }
      }
    } catch (err) {
      console.error('Failed to load alert data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedReqId) {
      toast.warning('Please select an active emergency requisition to broadcast.');
      return;
    }

    try {
      const res = await alertApi.createAlerts(selectedReqId, Number(radiusKm), Number(maxDonors));
      const dispatchedCount = res.data?.length || 0;
      if (dispatchedCount > 0) {
        const msg = `Dispatched emergency alert to ${dispatchedCount} compatible nearby donor(s) via Haversine distance!`;
        toast.success(msg, 'Alerts Dispatched');
        setMessage({ type: 'success', text: msg });
      } else {
        const msg = 'No compatible available donors found within the specified radius. Try expanding the search radius.';
        toast.info(msg, 'Zero Donors in Radius');
        setMessage({ type: 'warning', text: msg });
      }
      loadData();
    } catch (err) {
      const errMsg = err.message || 'Dispatch failed';
      toast.error(errMsg, 'Dispatch Error');
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleRespond = async (alertId, response) => {
    try {
      await alertApi.respondAlert(alertId, response);
      toast.success(`You have ${response} the emergency blood request!`, 'Response Recorded');
      setMessage({ type: 'success', text: `You have ${response} the emergency blood request!` });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit response');
      setMessage({ type: 'error', text: err.message || 'Failed to submit response' });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            Emergency Donor Alerts & Live Coordination
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Calculates nearest compatible donors within radius using PostgreSQL Haversine distance
          </p>
        </div>
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

      {isDonor ? (
        /* Donor View */
        <div className="hope-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
            Emergency Requests Dispatched to You
          </h3>
          {donorAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No emergency alerts assigned to your profile right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {donorAlerts.map((alt) => (
                <div key={alt.alert_id} style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: '#f8f9fd',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
                      URGENT: {alt.blood_group} ({alt.component}) needed at {alt.hospital_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Distance: ~{alt.distance_km} km away • Sent: {new Date(alt.sent_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {alt.response === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleRespond(alt.alert_id, 'ACCEPTED')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--success)',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '12px'
                          }}
                        >
                          Accept & Donate
                        </button>
                        <button
                          onClick={() => handleRespond(alt.alert_id, 'DECLINED')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#f5f6fa',
                            color: 'var(--text-muted)',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '12px',
                            border: '1px solid var(--border)'
                          }}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: alt.response === 'ACCEPTED' ? '#e8f5ec' : '#fbebee',
                        color: alt.response === 'ACCEPTED' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {alt.response}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Officer & Staff Dispatch Panel */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Dispatch form */}
          <div className="hope-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color="var(--danger)" />
              Dispatch Emergency Alert
            </h3>

            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Target Emergency Request</label>
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  <option value="">Select a Request</option>
                  {requests.map((r) => (
                    <option key={r.request_id} value={r.request_id}>
                      Req #{r.request_id}: {r.hospital_name} ({r.blood_group} {r.component})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Radius (km)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Max Donors to Notify</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxDonors}
                  onChange={(e) => setMaxDonors(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--danger)',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  marginTop: '10px'
                }}
              >
                <Send size={15} />
                Broadcast Emergency Alert
              </button>
            </form>
          </div>

          {/* Emergency requests monitor */}
          <div className="hope-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>
              Active Emergency Requisitions
            </h3>

            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No active EMERGENCY requisitions in queue
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map((r) => (
                  <div key={r.request_id} style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#fffaf8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--danger)' }}>
                        Req #{r.request_id} • {r.blood_group} ({r.component.replace('_', ' ')})
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {r.hospital_name} • Needed: {r.units_needed} units
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedReqId(r.request_id)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                    >
                      Select for Alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
