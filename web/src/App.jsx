import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/donors" element={
              <ProtectedRoute>
                <Layout>
                  <DonorsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/donations" element={
              <ProtectedRoute>
                <Layout>
                  <DonationsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/screenings" element={
              <ProtectedRoute>
                <Layout>
                  <ScreeningsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/requests" element={
              <ProtectedRoute>
                <Layout>
                  <RequisitionsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute>
                <Layout>
                  <InventoryPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/alerts" element={
              <ProtectedRoute>
                <Layout>
                  <EmergencyAlertsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/analytics" element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/audit" element={
              <ProtectedRoute>
                <Layout>
                  <AuditTrailPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
