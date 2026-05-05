// src/App.jsx
// Root component – sets up providers and routing

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ParkingProvider } from './store/ParkingContext';
import LoadingScreen from './components/LoadingScreen';
import NotificationToast from './components/NotificationToast';

const LoginScreen       = lazy(() => import('./screens/LoginScreen'));
const RegisterScreen    = lazy(() => import('./screens/RegisterScreen'));
const MapScreen         = lazy(() => import('./screens/MapScreen'));
const ProfileScreen     = lazy(() => import('./screens/ProfileScreen'));
const GroupsScreen      = lazy(() => import('./screens/GroupsScreen'));
const LeaderboardScreen = lazy(() => import('./screens/LeaderboardScreen'));
const AdminScreen       = lazy(() => import('./screens/AdminScreen'));
const ReportScreen      = lazy(() => import('./screens/ReportScreen'));

// ─── Route Guards ────────────────────────────────────────────────────────────

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  //if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  //if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  //if (loading) return <LoadingScreen />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

// ─── App with Providers ───────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <>
      <NotificationToast />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<PublicRoute><LoginScreen /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterScreen /></PublicRoute>} />

          {/* Protected routes */}
          <Route path="/"           element={<PrivateRoute><MapScreen /></PrivateRoute>} />
          <Route path="/report"     element={<PrivateRoute><ReportScreen /></PrivateRoute>} />
          <Route path="/profile"    element={<PrivateRoute><ProfileScreen /></PrivateRoute>} />
          <Route path="/groups"     element={<PrivateRoute><GroupsScreen /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><LeaderboardScreen /></PrivateRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminScreen /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ParkingProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ParkingProvider>
    </AuthProvider>
  );
}
