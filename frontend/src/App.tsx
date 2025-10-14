import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/theme.css';
import { useAuth } from './hooks/useAuth';
import { useAdminAuth } from './hooks/useAdminAuth';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import JoinContestPage from './pages/JoinContestPage';
import TeamRegistrationPage from './pages/TeamRegistrationPage';
import TeamLoginPage from './pages/TeamLoginPage';
import DashboardPage from './pages/DashboardPage';
import ProblemViewPage from './pages/ProblemViewPage';
import CodeEditorTestPage from './pages/CodeEditorTestPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateProblemPage from './pages/CreateProblemPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import ContestsListPage from './pages/admin/contests/ContestsListPage';
import ContestDetailPage from './pages/admin/contests/ContestDetailPage';
import CreateContestPageNew from './pages/admin/contests/CreateContestPage';
import ProblemsListPage from './pages/admin/problems/ProblemsListPage';
import TeamDetailPage from './pages/admin/teams/TeamDetailPage';
import ContestPage from './pages/ContestPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ProblemTestPage from './pages/ProblemTestPage';
import { createContestSlug } from './utils/contestUtils';

function App() {
  const auth = useAuth();
  const adminAuth = useAdminAuth();
  const [contestTimer, setContestTimer] = useState<number | undefined>(undefined);
  const teamContestSlug =
    auth.team?.contestSlug ||
    (auth.team?.contestName ? createContestSlug(auth.team.contestName) : null);

  useEffect(() => {
    if (auth.isAuthenticated && auth.team?.contestCode) {
      const fetchContestTimer = async () => {
        try {
          const response = await fetch(`/api/timer/contest/${auth.team.contestCode}/status`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.timing) {
              setContestTimer(data.data.timing.time_remaining_seconds);
            }
          }
        } catch (error) {
          console.error('Failed to fetch contest timer:', error);
        }
      };

      const updateTimer = () => {
        setContestTimer(prev => prev !== undefined ? Math.max(0, prev - 1) : undefined);
      };

      fetchContestTimer();
      
      const timerInterval = setInterval(updateTimer, 1000);
      
      const syncInterval = setInterval(fetchContestTimer, 30000);

      return () => {
        clearInterval(timerInterval);
        clearInterval(syncInterval);
      };
    }
  }, [auth.isAuthenticated, auth.team?.contestCode, auth.token]);

  if (auth.loading || adminAuth.loading) {
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
          {/* Admin Routes - Must be first and separate from team routes */}
          <Route
            path="/admin/login"
            element={
              adminAuth.isAuthenticated ? 
              <Navigate to="/admin/dashboard" replace /> : 
              <AdminLoginPage />
            }
          />
          
          <Route
            path="/admin"
            element={
              adminAuth.isAuthenticated ? 
              <Navigate to="/admin/dashboard" replace /> : 
              <Navigate to="/admin/login" replace />
            }
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
            path="/admin/contests/create"
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
            path="/admin/contests/:contestId/teams/:teamId"
            element={
              <AdminProtectedRoute>
                <TeamDetailPage />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/problems"
            element={
              <AdminProtectedRoute>
                <ProblemsListPage />
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

          {/* Public Routes */}
          <Route
            path="/"
            element={
              auth.isAuthenticated ?
              <Navigate to="/dashboard" replace /> :
              <HomePage />
            }
          />

          {/* Authless Test Route */}
          <Route
            path="/test-problems"
            element={<ProblemTestPage />}
          />

          <Route 
            path="/join-contest" 
            element={
              auth.isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <JoinContestPage />
            } 
          />

          <Route
            path="/team-registration"
            element={
              auth.isAuthenticated ?
              <Navigate to={teamContestSlug ? `/contest/${teamContestSlug}` : '/dashboard'} replace /> :
              <TeamRegistrationPage />
            }
          />

          <Route
            path="/register"
            element={
              auth.isAuthenticated ?
              <Navigate to={teamContestSlug ? `/contest/${teamContestSlug}` : '/dashboard'} replace /> :
              <TeamRegistrationPage />
            }
          />
          
          <Route 
            path="/login" 
            element={
              auth.isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <TeamLoginPage />
            } 
          />

          {/* Team Routes wrapped in Layout */}
          <Route path="/*" element={
            <Layout
              teamName={auth.team?.teamName}
              contestName="Hack The Valley 2025"
              timeRemaining={contestTimer}
              isAuthenticated={auth.isAuthenticated}
              onLogout={auth.logout}
            >
              <Routes>
            <Route
              path="/contest/:contestSlug"
              element={
                <ProtectedRoute>
                  <ContestPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/problem/:problemId"
              element={
                <ProtectedRoute>
                  <ProblemViewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/editor-test"
              element={<CodeEditorTestPage />}
            />

            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />

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
