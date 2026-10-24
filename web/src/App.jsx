import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import InventoryView from './views/InventoryView';
import DonorsView from './views/DonorsView';
import AnalyticsView from './views/AnalyticsView';
import ModalNewRequest from './components/ModalNewRequest';
import ModalNewDonor from './components/ModalNewDonor';
import ModalAuth from './components/ModalAuth';
import ModalAnnouncement from './components/ModalAnnouncement';
import { BloodBankApi, fallbackData } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // System & Auth States
  const [backendStatus, setBackendStatus] = useState({ isLive: false });
  const [currentUser, setCurrentUser] = useState({
    user_id: 'usr_admin',
    full_name: 'Austin Robertson',
    role_name: 'Marketing Administrator',
    email: 'admin@bloodbank.org',
  });

  // Data States
  const [stats, setStats] = useState(fallbackData.stats);
  const [trends, setTrends] = useState(fallbackData.chartTrends);
  const [inventory, setInventory] = useState(fallbackData.bloodGroups);
  const [requests, setRequests] = useState(fallbackData.urgentRequests);
  const [donors, setDonors] = useState(fallbackData.donors);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isDonorOpen, setIsDonorOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);

  // Initial Data Fetching & Health Check
  useEffect(() => {
    async function loadData() {
      // 1. Check Backend Connectivity
      const health = await BloodBankApi.checkHealth();
      setBackendStatus(health);

      // 2. Fetch inventory
      const invRes = await BloodBankApi.getInventory();
      if (invRes.isLive && invRes.data) {
        setInventory(invRes.data);
      }

      // 3. Fetch requests
      const reqRes = await BloodBankApi.getRequests();
      if (reqRes.isLive && reqRes.data) {
        setRequests(reqRes.data);
      }

      // 4. Fetch donors
      const donRes = await BloodBankApi.getDonors();
      if (donRes.isLive && donRes.data) {
        setDonors(donRes.data);
      }
    }

    loadData();
  }, []);

  // Handlers
  const handleCreateRequest = async (payload) => {
    const res = await BloodBankApi.createRequest(payload);
    if (res.success) {
      const newReq = {
        id: res.data?.id || 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        hospital: payload.hospital,
        blood_group: payload.blood_group,
        component: payload.component,
        units_needed: payload.units_needed,
        urgency: payload.urgency,
        status: 'PENDING',
        created_at: 'Just now',
        contact: payload.contact,
      };
      setRequests([newReq, ...requests]);
      setStats((prev) => ({
        ...prev,
        pendingRequests: prev.pendingRequests + 1,
      }));
    }
  };

  const handleRegisterDonor = async (payload) => {
    const res = await BloodBankApi.registerDonor(payload);
    if (res.success) {
      const newDonor = {
        id: 'DON-' + Math.floor(100 + Math.random() * 900),
        name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        blood_group: payload.blood_group,
        donations: 1,
        last_donated: 'Today',
        status: 'Eligible',
        city: payload.address || 'Surat',
      };
      setDonors([newDonor, ...donors]);
      setStats((prev) => ({
        ...prev,
        activeDonors: prev.activeDonors + 1,
      }));
    }
  };

  const handleLogin = async (email, password) => {
    const res = await BloodBankApi.login(email, password);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
    }
  };

  const handleAllocate = (request) => {
    setRequests(
      requests.map((r) =>
        r.id === request.id ? { ...r, status: 'DISPATCHED' } : r
      )
    );
    setStats((prev) => ({
      ...prev,
      pendingRequests: Math.max(0, prev.pendingRequests - 1),
      completedTransfusions: prev.completedTransfusions + request.units_needed,
    }));
  };

  const handleDownloadReport = () => {
    const headers = ['Request ID', 'Hospital', 'Blood Group', 'Component', 'Units', 'Urgency', 'Status'];
    const rows = requests.map((r) => [r.id, r.hospital, r.blood_group, r.component, r.units_needed, r.urgency, r.status]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BloodBank_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        sidebarOpen={sidebarOpen}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* 2. Main Body Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          backendStatus={backendStatus}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenNewRequest={() => setIsRequestOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              trends={trends}
              inventory={inventory}
              requests={requests}
              onOpenAnnouncement={() => setIsAnnouncementOpen(true)}
              onOpenNewRequest={() => setIsRequestOpen(true)}
              onAllocate={handleAllocate}
              onDownloadReport={handleDownloadReport}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView inventory={inventory} />
          )}

          {currentTab === 'donors' && (
            <DonorsView
              donors={donors}
              onOpenNewDonor={() => setIsDonorOpen(true)}
            />
          )}

          {currentTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">Hospital Blood Requests Pipeline</h2>
                  <p className="text-xs text-slate-400">Emergency transfusion matching and priority queuing</p>
                </div>
                <button
                  onClick={() => setIsRequestOpen(true)}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Create New Request
                </button>
              </div>
              <DashboardView
                stats={stats}
                trends={trends}
                inventory={inventory}
                requests={requests}
                onOpenAnnouncement={() => setIsAnnouncementOpen(true)}
                onOpenNewRequest={() => setIsRequestOpen(true)}
                onAllocate={handleAllocate}
                onDownloadReport={handleDownloadReport}
              />
            </div>
          )}

          {currentTab === 'analytics' && <AnalyticsView />}

          {(currentTab === 'menu_style' || currentTab === 'design_system' || currentTab === 'admin' || currentTab === 'audit' || currentTab === 'settings') && (
            <div className="bg-white rounded-2xl p-8 shadow-card border border-slate-100 text-center max-w-xl mx-auto my-12">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 mx-auto flex items-center justify-center font-bold text-xl mb-4">
                UI
              </div>
              <h3 className="text-lg font-bold text-slate-800 capitalize mb-1">
                {currentTab.replace('_', ' ')} Module
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Hope UI styled section connected to Blood Bank backend endpoints and database security roles.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Floating Design Customizer Button (matching the orange gear in screenshot) */}
      <button
        onClick={() => setIsAuthOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#EA6A3F] hover:bg-[#d9592f] text-white p-2.5 rounded-l-xl shadow-xl flex items-center justify-center z-40 transition-transform hover:-translate-x-1"
        title="Settings & Switch Roles"
      >
        <svg className="w-5 h-5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Floating Landing Pages Pill (matching right side badge in screenshot) */}
      <div className="fixed right-0 top-2/3 -translate-y-1/2 rotate-90 origin-right translate-x-3 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-t-lg shadow-lg hidden md:block cursor-pointer select-none">
        Blood Bank UI
      </div>

      {/* Modals */}
      <ModalNewRequest
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        onSubmit={handleCreateRequest}
      />

      <ModalNewDonor
        isOpen={isDonorOpen}
        onClose={() => setIsDonorOpen(false)}
        onSubmit={handleRegisterDonor}
      />

      <ModalAuth
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        currentUser={currentUser}
      />

      <ModalAnnouncement
        isOpen={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
      />
    </div>
  );
}
