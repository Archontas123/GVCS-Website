/**
 * CS Club Hackathon Platform - Main App Component
 * Phase 1.4: React Router setup with authentication and Material-UI theme
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CircularProgress, CssBaseline } from '@mui/material';

// Theme and services
import theme from './utils/theme';
import { useAuth } from './hooks/useAuth';

// Layout components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProblemViewPage from './pages/ProblemViewPage';
import CodeEditorTestPage from './pages/CodeEditorTestPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateContestPage from './pages/CreateContestPage';
import ContestsPage from './pages/ContestsPage';

// Admin components
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  const auth = useAuth();
  const [contestTimer, setContestTimer] = useState<number | undefined>(undefined);

  // Mock contest timer (will be replaced with real data)
  useEffect(() => {
    if (auth.isAuthenticated) {
      // Mock: Contest ends in 2 hours for demo
      const endTime = Date.now() + (2 * 60 * 60 * 1000);
      
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setContestTimer(remaining);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [auth.isAuthenticated]);

  // Loading screen
  if (auth.loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout
            teamName={auth.team?.teamName}
            contestName="CS Club Demo Contest"
            timeRemaining={contestTimer}
            isAuthenticated={auth.isAuthenticated}
            onLogout={auth.logout}
          >
            <Routes>
            {/* Public routes */}
            <Route 
              path="/" 
              element={
                auth.isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <HomePage />
              } 
            />
            
            <Route 
              path="/register" 
              element={
                auth.isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <RegisterPage />
              } 
            />
            
            <Route 
              path="/login" 
              element={
                auth.isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <LoginPage />
              } 
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Problem viewing route */}
            <Route
              path="/problem/:problemId"
              element={
                <ProtectedRoute>
                  <ProblemViewPage />
                </ProtectedRoute>
              }
            />

            {/* Code Editor Test Page */}
            <Route
              path="/editor-test"
              element={
                <ProtectedRoute>
                  <CodeEditorTestPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <h2>Leaderboard</h2>
                    <p>This page will be implemented in Phase 3 (ICCP Scoring System)</p>
                  </Box>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/login"
              element={<AdminLoginPage />}
            />
            
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboardPage />
                </AdminProtectedRoute>
              }
            />
            
            <Route
              path="/admin/contests"
              element={
                <AdminProtectedRoute>
                  <ContestsPage />
                </AdminProtectedRoute>
              }
            />
            
            <Route
              path="/admin/contests/new"
              element={
                <AdminProtectedRoute>
                  <CreateContestPage />
                </AdminProtectedRoute>
              }
            />
            
            <Route
              path="/admin/*"
              element={
                <AdminProtectedRoute>
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <h2>Admin Feature</h2>
                    <p>This admin feature is under development</p>
                  </Box>
                </AdminProtectedRoute>
              }
            />

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <h2>Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                </Box>
              }
            />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
