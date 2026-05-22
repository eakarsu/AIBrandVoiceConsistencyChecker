import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIToolPage from './pages/AIToolPage';
import Webhooks from './pages/Webhooks';
import Layout from './components/Layout';
import ClaimSubstantiationPage from './pages/ClaimSubstantiationPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/feature/:featureKey" element={<ProtectedRoute><Layout><FeaturePage /></Layout></ProtectedRoute>} />
      <Route path="/ai/:toolKey" element={<ProtectedRoute><Layout><AIToolPage /></Layout></ProtectedRoute>} />
      <Route path="/webhooks" element={<ProtectedRoute><Layout><Webhooks /></Layout></ProtectedRoute>} />
      <Route path="/claim-substantiation" element={<ProtectedRoute><Layout><ClaimSubstantiationPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
