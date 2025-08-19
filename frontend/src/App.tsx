/**
 * Hack The Valley - Main App Component
 * React Router setup with authentication for school hackathon
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Theme and services
import './styles/theme.css';
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
import CreateProblemPage from './pages/CreateProblemPage';
import ProblemDetailPage from './pages/ProblemDetailPage';

// New simplified contest pages
import ContestsListPage from './pages/admin/contests/ContestsListPage';
import ContestDetailPage from './pages/admin/contests/ContestDetailPage';
import CreateContestPageNew from './pages/admin/contests/CreateContestPage';

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
      <div className="flex-center full-height">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Admin routes - no layout wrapper */}
          <Route
            path="/admin/login"
            element={<AdminLoginPage />}
          />
          
          <Route
            path="/admin"
            element={<Navigate to="/admin/login" replace />}
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
                <ContestsListPage />
              </AdminProtectedRoute>
            }
          />
          
          <Route
            path="/admin/contests/new"
            element={
              <AdminProtectedRoute>
                <CreateContestPageNew />
              </AdminProtectedRoute>
            }
          />
          
          <Route
            path="/admin/contests/:contestId"
            element={
              <AdminProtectedRoute>
                <ContestDetailPage />
              </AdminProtectedRoute>
            }
          />
          
          <Route
            path="/admin/problems/new"
            element={
              <AdminProtectedRoute>
                <CreateProblemPage />
              </AdminProtectedRoute>
            }
          />
          
          <Route
            path="/admin/problems/:problemId"
            element={
              <AdminProtectedRoute>
                <ProblemDetailPage />
              </AdminProtectedRoute>
            }
          />
          
          <Route
            path="/admin/*"
            element={
              <AdminProtectedRoute>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h2>Admin Feature</h2>
                  <p>This admin feature is under development</p>
                </div>
              </AdminProtectedRoute>
            }
          />

          {/* Public routes without layout */}
          <Route 
            path="/" 
            element={
              auth.isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/register" replace />
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
          
          <Route 
            path="/register" 
            element={
              auth.isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <RegisterPage />
            } 
          />

          {/* Regular app routes with layout */}
          <Route path="/*" element={
            <Layout
              teamName={auth.team?.teamName}
              contestName="Hack The Valley 2025"
              timeRemaining={contestTimer}
              isAuthenticated={auth.isAuthenticated}
              onLogout={auth.logout}
            >
              <Routes>
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
                  <div className="p-4 text-center">
                    <h2>Leaderboard</h2>
                    <p>This page will be implemented in Phase 3 (ICCP Scoring System)</p>
                  </div>
                </ProtectedRoute>
              }
            />

                {/* 404 fallback */}
                <Route
                  path="*"
                  element={
                    <div className="p-4 text-center">
                      <h2>Page Not Found</h2>
                      <p>The page you're looking for doesn't exist.</p>
                    </div>
                  }
                />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
