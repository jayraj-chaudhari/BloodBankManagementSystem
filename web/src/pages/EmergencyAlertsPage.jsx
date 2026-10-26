import React, { useState, useEffect } from 'react';
import { Radio, Send, CheckCircle2, XCircle, MapPin, AlertTriangle, Users, Search, RefreshCw } from 'lucide-react';
import { alertApi, requestApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';

export default function EmergencyAlertsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { lastRequestEvent, liveAlerts } = useSocket();
  const role = user?.role || user?.role_name;
  const isDonor = role === 'donor';

  const [donorAlerts, setDonorAlerts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [maxDonors, setMaxDonors] = useState(5);
  const [candidates, setCandidates] = useState([]);
  const [dispatchedAlerts, setDispatchedAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
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

  const loadCandidates = async (reqId = selectedReqId) => {
    if (!reqId || isDonor) return;
    try {
      setCandidatesLoading(true);
      const res = await alertApi.getCandidateDonors(reqId, {
        radius_km: Number(radiusKm),
        max_donors: Number(maxDonors)
      });
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to load candidate donors:', err);
      toast.error(err.message || 'Failed to search candidate donors');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const loadDispatchedAlerts = async (reqId = selectedReqId) => {
    if (!reqId || isDonor) return;
    try {
      setAlertsLoading(true);
      const res = await alertApi.getAlertsForRequest(reqId);
      setDispatchedAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load dispatched alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, lastRequestEvent]);

  useEffect(() => {
    if (selectedReqId && !isDonor) {
      loadCandidates(selectedReqId);
      loadDispatchedAlerts(selectedReqId);
    }
  }, [selectedReqId, radiusKm, maxDonors, liveAlerts]);

  const handleDispatch = async (e) => {
    if (e) e.preventDefault();
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
        const msg = 'No new unnotified donors found within the specified radius. Try expanding the search radius.';
        toast.info(msg, 'Zero Donors in Radius');
        setMessage({ type: 'warning', text: msg });
      }
      loadCandidates(selectedReqId);
      loadDispatchedAlerts(selectedReqId);
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
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Emergency Donor Alerts & Live Coordination
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Calculates nearest compatible donors within radius using PostgreSQL Haversine distance (fn_distance_km)
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
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: 'inherit' }}>✕</button>
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
              No active emergency donor alerts at this time. Thank you for your readiness to save lives!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {donorAlerts.map((alt) => (
                <div key={alt.alert_id} style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
                        EMERGENCY: {alt.blood_group} ({alt.component})
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: 'var(--danger)'
                      }}>
                        {alt.distance_km} km away
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontWeight: '600' }}>
                      {alt.hospital_name} ({alt.hospital_city})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Alert dispatched: {new Date(alt.sent_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {alt.response === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleRespond(alt.alert_id, 'ACCEPTED')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--success)',
                            color: '#ffffff',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Accept & Donate
                        </button>
                        <button
                          onClick={() => handleRespond(alt.alert_id, 'DECLINED')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#f1f5f9',
                            color: 'var(--text-main)',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          <XCircle size={16} />
                          Decline
                        </button>
                      </>
                    ) : (
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: alt.response === 'ACCEPTED' ? '#e8f5ec' : '#fbebee',
                        color: alt.response === 'ACCEPTED' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        Response: {alt.response} {alt.responded_at ? `(${new Date(alt.responded_at).toLocaleTimeString()})` : ''}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Grid: Selector & Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Dispatch Form Controls */}
            <div className="hope-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="var(--danger)" />
                Emergency Alert Controls
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Top Donors Limit</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={maxDonors}
                      onChange={(e) => setMaxDonors(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => loadCandidates(selectedReqId)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: '#f1f5f9',
                      color: 'var(--text-main)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    <Search size={15} /> Find Donors ({radiusKm} km)
                  </button>

                  <button
                    type="button"
                    onClick={handleDispatch}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--danger)',
                      color: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={15} /> Send Alerts ({maxDonors})
                  </button>
                </div>
              </div>
            </div>

            {/* Emergency Requests Quick Monitor */}
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
                  {requests.map((r) => {
                    const isSelected = String(r.request_id) === String(selectedReqId);
                    return (
                      <div
                        key={r.request_id}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? 'var(--danger)' : 'var(--border-light)'}`,
                          backgroundColor: isSelected ? '#fff5f5' : '#fffaf8',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--danger)' }}>
                            Req #{r.request_id} • {r.blood_group} ({r.component.replace('_', ' ')})
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {r.hospital_name} • Needed: {r.units_needed} units • Status: <strong>{r.status}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedReqId(String(r.request_id))}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: isSelected ? 'var(--danger)' : '#ffffff',
                            border: '1px solid var(--danger)',
                            color: isSelected ? '#ffffff' : 'var(--danger)',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? 'Active Target' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Candidate Donors in Radius Preview (Step 6.5) */}
          <div className="hope-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                  Candidate Donors Within {radiusKm} km (Haversine Geo-Search)
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {candidates.length} Eligible Candidate(s) Found
              </span>
            </div>

            {candidatesLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Calculating distances...</div>
            ) : candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                No candidate donors found within {radiusKm} km radius. Click "Find Donors" or expand the radius distance.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>Donor ID</th>
                      <th style={{ padding: '10px 14px' }}>Full Name</th>
                      <th style={{ padding: '10px 14px' }}>Blood Group</th>
                      <th style={{ padding: '10px 14px' }}>Region</th>
                      <th style={{ padding: '10px 14px' }}>Distance (Haversine)</th>
                      <th style={{ padding: '10px 14px' }}>Availability</th>
                      <th style={{ padding: '10px 14px' }}>Alert Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((cd) => (
                      <tr key={cd.donor_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '700' }}>#{cd.donor_id}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '600' }}>{cd.donor_name}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: '800', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '12px' }}>
                            {cd.blood_group}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{cd.region_code}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--primary)' }}>
                          {cd.distance_km} km
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: cd.is_eligible ? 'var(--success)' : 'var(--warning)' }}>
                            ● {cd.is_eligible ? 'ELIGIBLE' : 'WAIT PERIOD'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            backgroundColor: cd.already_alerted ? '#fef3c7' : '#f1f5f9',
                            color: cd.already_alerted ? '#b45309' : '#475569'
                          }}>
                            {cd.already_alerted ? 'Alert Sent' : 'Ready to Alert'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dispatched Alerts History & Live Responses (Step 6.6 & Act 7) */}
          <div className="hope-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--success)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                  Dispatched Alerts & Live Donor Responses (Request #{selectedReqId})
                </h3>
              </div>
              <button
                onClick={() => loadDispatchedAlerts(selectedReqId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} /> Refresh Responses
              </button>
            </div>

            {alertsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading alerts log...</div>
            ) : dispatchedAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                No alerts currently dispatched for Request #{selectedReqId}. Use the controls above to dispatch alerts.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>Alert #</th>
                      <th style={{ padding: '10px 14px' }}>Donor Name</th>
                      <th style={{ padding: '10px 14px' }}>Blood Group</th>
                      <th style={{ padding: '10px 14px' }}>Distance</th>
                      <th style={{ padding: '10px 14px' }}>Dispatched At</th>
                      <th style={{ padding: '10px 14px' }}>Donor Response</th>
                      <th style={{ padding: '10px 14px' }}>Responded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchedAlerts.map((alt) => {
                      const isAcc = alt.response === 'ACCEPTED';
                      const isDec = alt.response === 'DECLINED';
                      return (
                        <tr key={alt.alert_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700' }}>#{alt.alert_id}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '600' }}>{alt.donor_name}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontWeight: '800', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '12px' }}>
                              {alt.blood_group}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '600' }}>{alt.distance_km} km</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {new Date(alt.sent_at).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              backgroundColor: isAcc ? '#dcfce7' : isDec ? '#fee2e2' : '#fef3c7',
                              color: isAcc ? '#15803d' : isDec ? '#b91c1c' : '#b45309'
                            }}>
                              {alt.response}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {alt.responded_at ? new Date(alt.responded_at).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
