/**
 * CS Club Hackathon Platform - Admin Dashboard
 * Phase 2.5: Enhanced admin interface with comprehensive monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  useTheme,
} from '@mui/material';
import {
  EmojiEvents,
  Quiz,
  People,
  Add,
  Assessment,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import AdminLayout from '../components/Layout/AdminLayout';
import ContestOverviewWidget from '../components/Admin/ContestOverviewWidget';
import TeamRegistrationMonitor from '../components/Admin/TeamRegistrationMonitor';
import SubmissionFeedDisplay from '../components/Admin/SubmissionFeedDisplay';
import ContestControlPanel from '../components/Admin/ContestControlPanel';
import SystemMonitoringDashboard from '../components/Admin/SystemMonitoringDashboard';
import apiService from '../services/api';

interface Contest {
  id: number;
  contest_name: string;
  description: string;
  start_time: string;
  duration: number;
  status: 'not_started' | 'running' | 'frozen' | 'ended';
  is_active: boolean;
  registration_code: string;
  problems_count?: number;
  teams_count?: number;
}

const AdminDashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardView, setDashboardView] = useState<'overview' | 'teams' | 'submissions'>('overview');

  // Enhanced stats - in real app, these would come from API
  const stats = {
    totalContests: contests.length,
    activeContests: contests.filter(c => c.is_active).length,
    totalProblems: contests.reduce((acc, c) => acc + (c.problems_count || 0), 0),
    totalTeams: contests.reduce((acc, c) => acc + (c.teams_count || 0), 0),
    totalSubmissions: 1247, // Mock data
    systemHealth: 'healthy' as 'healthy' | 'warning' | 'error',
    pendingJudging: 15
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const response = await apiService.getAdminContests();
      if (response.success) {
        setContests(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => navigate('/admin/contests/new')}
        size="small"
      >
        New Contest
      </Button>
    </Box>
  );

  const alerts = stats.systemHealth !== 'healthy' ? [{
    type: stats.systemHealth as 'warning' | 'error',
    message: stats.systemHealth === 'warning' 
      ? 'Some system components are experiencing issues'
      : 'Critical system error detected'
  }] : [];

  return (
    <AdminLayout 
      title="Dashboard" 
      actions={quickActions}
      alerts={alerts}
    >
      {/* Stats Overview */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {stats.totalContests}
                </Typography>
                <Typography color="text.secondary">Total Contests</Typography>
                <Chip 
                  label={`${stats.activeContests} active`} 
                  size="small" 
                  color={stats.activeContests > 0 ? 'success' : 'default'}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Quiz sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {stats.totalProblems}
                </Typography>
                <Typography color="text.secondary">Total Problems</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <People sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {stats.totalTeams}
                </Typography>
                <Typography color="text.secondary">Registered Teams</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Assessment sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {stats.totalSubmissions}
                </Typography>
                <Typography color="text.secondary">Total Submissions</Typography>
                <Chip 
                  label={`${stats.pendingJudging} pending`} 
                  size="small" 
                  color={stats.pendingJudging > 0 ? 'warning' : 'default'}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Dashboard Content Sections */}
      <Grid container spacing={4}>
        {/* Contest Overview Widget */}
        <Grid item xs={12}>
          <ContestOverviewWidget />
        </Grid>

        {/* Team Registration Monitor */}
        <Grid item xs={12}>
          <TeamRegistrationMonitor />
        </Grid>

        {/* Contest Control Panel */}
        <Grid item xs={12}>
          <ContestControlPanel />
        </Grid>

        {/* Submission Feed Display */}
        <Grid item xs={12}>
          <SubmissionFeedDisplay />
        </Grid>

        {/* System Monitoring Dashboard */}
        <Grid item xs={12}>
          <SystemMonitoringDashboard />
        </Grid>

        {/* Quick Actions Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/admin/contests/new')}
                  fullWidth
                >
                  Create Contest
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Quiz />}
                  onClick={() => navigate('/admin/problems')}
                  fullWidth
                >
                  Manage Problems
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => navigate('/admin/teams')}
                  fullWidth
                >
                  View Teams
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Timeline />}
                  onClick={() => navigate('/admin/monitor')}
                  fullWidth
                >
                  System Monitor
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Judge Queue</Typography>
                  <Chip 
                    label={stats.pendingJudging > 0 ? `${stats.pendingJudging} pending` : 'Empty'} 
                    color={stats.pendingJudging > 0 ? 'warning' : 'success'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Database</Typography>
                  <Chip label="Connected" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Contest Timer</Typography>
                  <Chip label="Running" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Overall Health</Typography>
                  <Chip 
                    label={stats.systemHealth}
                    color={stats.systemHealth === 'healthy' ? 'success' : stats.systemHealth === 'warning' ? 'warning' : 'error'}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
};

export default AdminDashboardPage;