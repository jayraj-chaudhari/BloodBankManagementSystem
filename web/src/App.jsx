import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/layout/Layout';

// Pages
import DashboardPage from './pages/DashboardPage';
import DonorsPage from './pages/DonorsPage';
import DonationsPage from './pages/DonationsPage';
import ScreeningsPage from './pages/ScreeningsPage';
import RequisitionsPage from './pages/RequisitionsPage';
import InventoryPage from './pages/InventoryPage';
import EmergencyAlertsPage from './pages/EmergencyAlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import LoginPage from './pages/LoginPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role || user?.role_name;
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Dynamic Role-Based Main Dashboard */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Donors Registry: Officer, Admin */}
              <Route path="/donors" element={
                <ProtectedRoute allowedRoles={['bb_officer', 'admin']}>
                  <Layout>
                    <DonorsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Donations Intake: Officer, Admin, Donor */}
              <Route path="/donations" element={
                <ProtectedRoute allowedRoles={['bb_officer', 'admin', 'donor']}>
                  <Layout>
                    <DonationsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Screenings Lab: Lab Tech, Admin, Donor (own results) */}
              <Route path="/screenings" element={
                <ProtectedRoute allowedRoles={['lab_tech', 'admin', 'donor']}>
                  <Layout>
                    <ScreeningsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Requisitions Desk: Hospital, Officer, Admin, Auditor */}
              <Route path="/requests" element={
                <ProtectedRoute allowedRoles={['hospital_user', 'bb_officer', 'admin', 'auditor']}>
                  <Layout>
                    <RequisitionsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Blood Inventory: Hospital (public view), Officer, Lab Tech, Admin, Auditor */}
              <Route path="/inventory" element={
                <ProtectedRoute allowedRoles={['hospital_user', 'bb_officer', 'admin', 'lab_tech', 'auditor']}>
                  <Layout>
                    <InventoryPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Emergency Alerts: Officer, Admin, Donor */}
              <Route path="/alerts" element={
                <ProtectedRoute allowedRoles={['bb_officer', 'admin', 'donor']}>
                  <Layout>
                    <EmergencyAlertsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* SQL Analytics: Officer, Admin, Auditor, Lab Tech */}
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['bb_officer', 'admin', 'auditor', 'lab_tech']}>
                  <Layout>
                    <AnalyticsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Tamper-Evident Audit Hash Chain: Auditor, Admin */}
              <Route path="/audit" element={
                <ProtectedRoute allowedRoles={['auditor', 'admin']}>
                  <Layout>
                    <AuditTrailPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
