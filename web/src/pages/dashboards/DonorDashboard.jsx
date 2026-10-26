import React, { useState, useEffect } from 'react';
import {
  Heart,
  Droplet,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  FileText,
  UserCheck,
  ShieldCheck,
  Award,
  Sparkles,
  Shield
} from 'lucide-react';
import HeroBanner from '../../components/common/HeroBanner';
import StatCard from '../../components/common/StatCard';
import { donorApi, donationApi, alertApi, screeningApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function DonorDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [donorProfile, setDonorProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const donorId = donorProfile?.donor_id || user?.donor_id;
  const donorName = user?.full_name || donorProfile?.full_name || 'Donor';
  const bloodGroup = donorProfile?.blood_group || user?.blood_group || 'O+';

  const loadDonorData = async () => {
    try {
      setLoading(true);
      // 1. Fetch own donor profile via /donors/me (RLS enforced)
      try {
        const profRes = await donorApi.getDonorMe();
        setDonorProfile(profRes.data);
      } catch (err) {
        console.warn('Could not load specific donor profile:', err);
      }

      // 2. Fetch my donation history via /donations/me
      let myDonations = [];
      try {
        const donRes = await donationApi.getDonationsMe();
        myDonations = donRes.data || [];
        setDonations(myDonations);
      } catch (err) {
        console.warn('Donations load:', err);
      }

      // 3. Fetch screening results for the donor's latest donation
      if (myDonations.length > 0 && myDonations[0]?.donation_id) {
        try {
          const scrRes = await screeningApi.getScreenings(myDonations[0].donation_id);
          setScreenings(scrRes.data || []);
        } catch (err) {
          console.warn('Screenings load:', err);
        }
      }

      // 4. Fetch emergency donor alerts targeted to me
      try {
        const alertRes = await alertApi.getMyAlerts();
        setAlerts(alertRes.data || []);
      } catch (err) {
        console.warn('Alerts load:', err);
      }
    } catch (e) {
      toast.error('Failed to load donor profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonorData();
  }, []);

  const handleToggleAvailability = async () => {
    if (!donorProfile && !donorId) return;
    try {
      setUpdatingAvailability(true);
      const targetId = donorProfile?.donor_id || donorId;
      const newStatus = !donorProfile?.is_available;
      await donorApi.updateDonor(targetId, {
        is_available: newStatus
      });
      setDonorProfile(prev => ({ ...prev, is_available: newStatus }));
      toast.success(
        `Availability updated: you are now ${newStatus ? 'AVAILABLE for emergency contact' : 'OFFLINE'}`,
        'Donor Status'
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update availability status');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleRespondAlert = async (alertId, responseStatus) => {
    try {
      await alertApi.respondAlert(alertId, responseStatus);
      toast.success(`You have marked this alert as ${responseStatus}. Thank you!`, 'Alert Response Recorded');
      loadDonorData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit response');
    }
  };

  const isEligible = donorProfile?.is_eligible;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Donor Banner with prominent Donor ID right next to donor's name */}
      <HeroBanner
        title={`Welcome, ${donorName}!`}
        titleExtra={
          donorId ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                color: '#1e3bb3',
                fontSize: '13px',
                fontWeight: '800',
                padding: '4px 14px',
                borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                letterSpacing: '0.4px',
                border: '1px solid rgba(255, 255, 255, 0.8)'
              }}
              title="Permanent Medical Donor Identification"
            >
              <UserCheck size={16} color="#3a57e8" />
              Donor ID: #{donorId}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px'
              }}
            >
              Donor ID: Resolving...
            </span>
          )
        }
        subtitle="Thank you for being a registered voluntary blood donor. Your unique Donor ID is shown right next to your name and verifies your permanent medical record."
        badgeText={`Donor ID: #${donorId || '...'} | Blood Group: ${bloodGroup}`}
        actions={[
          {
            label: donorProfile?.is_available ? 'Set Unavailable' : 'Set Available to Donate',
            icon: Heart,
            variant: donorProfile?.is_available ? 'secondary' : 'primary',
            onClick: handleToggleAvailability
          }
        ]}
      />

      {/* Permanent Donor Credential Strip */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 24px',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#eef2ff',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={26} color="#3a57e8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                {donorName}
              </span>
              <span style={{
                backgroundColor: '#3a57e8',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                letterSpacing: '0.4px'
              }}>
                DONOR ID #{donorId || '...'}
              </span>
              <span style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {bloodGroup}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Permanent Registry Card &bull; Region: <strong>{donorProfile?.region_code || 'SUR'}</strong> &bull; Status: {donorProfile?.is_available ? '🟢 Active & Available' : '⚪ Standing By'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '8px',
            backgroundColor: isEligible ? '#ecfdf5' : '#fffbeb',
            color: isEligible ? '#059669' : '#b45309',
            fontWeight: '700',
            border: `1px solid ${isEligible ? '#a7f3d0' : '#fde68a'}`
          }}>
            {isEligible ? '✓ Ready for Next Donation' : '⏳ Cooling Interval Active'}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatCard
          icon={Droplet}
          label="Total Donations"
          value={donations.length}
          badgeText="Verified Units"
          color="#3a57e8"
        />
        <StatCard
          icon={CheckCircle2}
          label="Medical Eligibility"
          value={isEligible ? 'Eligible' : 'Interval Active'}
          badgeText={isEligible ? 'Ready to Donate' : 'Waiting Gap'}
          color={isEligible ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          icon={Calendar}
          label="Next Eligible Date"
          value={donorProfile?.next_eligible_on ? new Date(donorProfile.next_eligible_on).toLocaleDateString() : 'Immediate'}
          badgeText="18-65 Age Rule"
          color="#08b1ba"
        />
        <StatCard
          icon={Radio}
          label="Pending Alerts"
          value={alerts.filter(a => a.response === 'PENDING').length}
          badgeText="Emergency Calls"
          color="#ef4444"
        />
      </div>

      {/* Main Grid: Emergency Alerts & Donation History */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        {/* Emergency Alerts Panel */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Radio size={20} color="#ef4444" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Emergency Donor Dispatches
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Live calls when hospitals request your compatible blood group nearby
              </div>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No emergency dispatches in your area at this time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((al) => (
                <div
                  key={al.alert_id}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: '#fff7ed',
                    borderLeft: '4px solid #f97316'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#c2410c' }}>
                      URGENT CALL: {al.blood_group || 'O+'} NEEDED
                    </span>
                    <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: '700' }}>
                      {al.distance_km ? `${al.distance_km} km away` : 'Nearby'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    Hospital: <strong>{al.hospital_name || 'Civil Hospital'}</strong>
                  </div>

                  {al.response === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => handleRespondAlert(al.alert_id, 'ACCEPTED')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '4px',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Accept to Donate
                      </button>
                      <button
                        onClick={() => handleRespondAlert(al.alert_id, 'DECLINED')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '4px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', color: al.response === 'ACCEPTED' ? '#059669' : '#b91c1c' }}>
                      Response: {al.response} ({al.responded_at ? new Date(al.responded_at).toLocaleDateString() : 'Logged'})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donations & Screening Records */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
            My Clinical Donations & Screening
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Encrypted laboratory report records and donation intake log
          </div>

          {donations.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No donation records logged yet. Visit any certified regional branch to record your first intake.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Date</th>
                    <th style={{ padding: '10px 8px' }}>Branch</th>
                    <th style={{ padding: '10px 8px' }}>Volume</th>
                    <th style={{ padding: '10px 8px' }}>Hb (g/dL)</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.donation_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                        {new Date(d.donated_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>
                        {d.branch_name || 'Regional Hub'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{d.volume_ml} mL</td>
                      <td style={{ padding: '12px 8px', fontWeight: '700' }}>{d.hemoglobin_gdl}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          fontWeight: '700',
                          fontSize: '11px'
                        }}>
                          Verified Intake
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
