/**
 * Contest Overview Widget - Phase 2.5 Task 2
 * Display active contests and real-time statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  EmojiEvents,
  Timer,
  People,
  Assessment,
  PlayArrow,
  Pause,
  Stop,
  Visibility,
  Refresh,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ContestStats {
  total_submissions: number;
  problems_solved: number;
  team_participation_rate: number;
  average_solve_time: number;
}

interface ActiveContest {
  id: number;
  contest_name: string;
  start_time: string;
  duration: number;
  time_remaining_seconds: number;
  time_elapsed_seconds: number;
  progress_percentage: number;
  status: 'not_started' | 'running' | 'frozen' | 'ended';
  registration_code: string;
  teams_count: number;
  submissions_count: number;
  stats: ContestStats;
}

interface ContestOverviewWidgetProps {
  refreshInterval?: number;
}

const ContestOverviewWidget: React.FC<ContestOverviewWidgetProps> = ({ 
  refreshInterval = 30000 
}) => {
  const navigate = useNavigate();
  const [activeContests, setActiveContests] = useState<ActiveContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock data - in real app, this would come from API
  useEffect(() => {
    fetchActiveContests();
    const interval = setInterval(fetchActiveContests, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchActiveContests = async () => {
    try {
      // Mock API call - replace with real API
      const mockContests: ActiveContest[] = [
        {
          id: 1,
          contest_name: 'ICPC Practice Round',
          start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          duration: 180, // 3 hours
          time_remaining_seconds: 6300, // 1 hour 45 minutes left
          time_elapsed_seconds: 3900, // 1 hour 5 minutes elapsed
          progress_percentage: 35.4,
          status: 'running',
          registration_code: 'ICPC2024',
          teams_count: 24,
          submissions_count: 156,
          stats: {
            total_submissions: 156,
            problems_solved: 45,
            team_participation_rate: 87.5,
            average_solve_time: 25.6
          }
        },
        {
          id: 2,
          contest_name: 'Beginner Programming Contest',
          start_time: new Date(Date.now() - 2700000).toISOString(), // 45 minutes ago
          duration: 90, // 1.5 hours
          time_remaining_seconds: 2700, // 45 minutes left
          time_elapsed_seconds: 2700, // 45 minutes elapsed
          progress_percentage: 50,
          status: 'running',
          registration_code: 'BEGIN01',
          teams_count: 16,
          submissions_count: 78,
          stats: {
            total_submissions: 78,
            problems_solved: 28,
            team_participation_rate: 93.8,
            average_solve_time: 15.2
          }
        }
      ];

      setActiveContests(mockContests);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch active contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'frozen': return 'warning';
      case 'ended': return 'default';
      default: return 'info';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'running': return 'Running';
      case 'frozen': return 'Frozen';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Contest Overview</Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Active Contests
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchActiveContests}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {activeContests.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <EmojiEvents sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No active contests
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              All contests have ended or haven't started yet
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/admin/contests')}
            >
              Manage Contests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3} direction={{ xs: 'column', lg: 'row' }}>
          {activeContests.map((contest) => (
            <Box key={contest.id} sx={{ flex: { lg: 1 }, minWidth: 0 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  {/* Contest Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {contest.contest_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={getStatusText(contest.status)}
                          color={getStatusColor(contest.status) as any}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          Code: {contest.registration_code}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => navigate(`/admin/contests/${contest.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contest.progress_percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={contest.progress_percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Remaining: {formatTime(contest.time_remaining_seconds)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Duration: {contest.duration} min
                      </Typography>
                    </Box>
                  </Box>

                  {/* Stats Grid */}
                  <Stack direction="row" spacing={2}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'background.default', flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                        <People sx={{ fontSize: 18, mr: 0.5, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {contest.teams_count}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Teams
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'background.default', flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                        <Assessment sx={{ fontSize: 18, mr: 0.5, color: 'secondary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {contest.submissions_count}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Submissions
                      </Typography>
                    </Paper>
                  </Stack>

                  {/* Additional Stats */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Performance Metrics
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main' }}>
                            <TrendingUp sx={{ fontSize: 14 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary="Problems Solved"
                          secondary={`${contest.stats.problems_solved} total`}
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {contest.stats.team_participation_rate.toFixed(1)}%
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'info.main' }}>
                            <Schedule sx={{ fontSize: 14 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary="Avg. Solve Time"
                          secondary="Per problem"
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {contest.stats.average_solve_time.toFixed(1)}m
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ContestOverviewWidget;