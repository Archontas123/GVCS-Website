/**
 * Contest Control Panel - Phase 2.5 Task 5
 * Contest control buttons and system monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

interface Contest {
  id: number;
  contest_name: string;
  status: 'not_started' | 'running' | 'frozen' | 'ended';
  start_time: string;
  duration: number;
  time_remaining_seconds: number;
  progress_percentage: number;
  teams_count: number;
  registration_code: string;
}

interface SystemStatus {
  judge_queue: {
    pending: number;
    processing: number;
    workers_active: number;
    avg_processing_time: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connections: number;
    response_time: number;
  };
  server: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
  };
  contests_scheduler: {
    status: 'running' | 'stopped';
    last_check: string;
    scheduled_tasks: number;
  };
}

const ContestControlPanel: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    judge_queue: { pending: 0, processing: 0, workers_active: 0, avg_processing_time: 0 },
    database: { status: 'disconnected', connections: 0, response_time: 0 },
    server: { cpu_usage: 0, memory_usage: 0, disk_usage: 0, uptime: 0 },
    contests_scheduler: { status: 'stopped', last_check: '', scheduled_tasks: 0 }
  });
  const [controlDialog, setControlDialog] = useState<{
    open: boolean;
    action: 'start' | 'freeze' | 'end' | 'emergency_stop' | null;
  }>({ open: false, action: null });
  const [loading, setLoading] = useState(false);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    fetchContests();
    fetchSystemStatus();
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchContests = async () => {
    try {
      const response = await fetch('/api/admin/contests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Get progress data for each contest
          const contestPromises = result.data.map(async (contest: any) => {
            try {
              const progressResponse = await fetch(`/api/admin/contests/${contest.id}/progress`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const progressData = await progressResponse.json();
              const progress = progressData.success ? progressData.data : null;
              
              return {
                id: contest.id,
                contest_name: contest.contest_name,
                status: progress?.status || 'not_started',
                start_time: contest.start_time,
                duration: contest.duration,
                time_remaining_seconds: progress?.time_remaining_seconds || 0,
                progress_percentage: progress?.progress_percentage || 0,
                teams_count: contest.teams_count || 0,
                registration_code: contest.registration_code
              };
            } catch (error) {
              console.error(`Error fetching progress for contest ${contest.id}:`, error);
              return {
                id: contest.id,
                contest_name: contest.contest_name,
                status: 'not_started' as const,
                start_time: contest.start_time,
                duration: contest.duration,
                time_remaining_seconds: 0,
                progress_percentage: 0,
                teams_count: 0,
                registration_code: contest.registration_code
              };
            }
          });
          
          const contests = await Promise.all(contestPromises);
          setContests(contests);
          
          if (!selectedContest && contests.length > 0) {
            setSelectedContest(contests[0]);
          }
        }
      } else {
        console.error('Failed to fetch contests - API error');
        setContests([]);
      }
    } catch (error) {
      console.error('Failed to fetch contests:', error);
      setContests([]);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          setSystemStatus({
            judge_queue: {
              pending: data.judge_queue?.pending || 0,
              processing: data.judge_queue?.processing || 0,
              workers_active: data.judge_queue?.workers_active || 0,
              avg_processing_time: data.judge_queue?.avg_processing_time || 0
            },
            database: {
              status: data.database?.status || 'connected',
              connections: data.database?.connections || 0,
              response_time: data.database?.response_time || 0
            },
            server: {
              cpu_usage: data.server?.cpu_usage || 0,
              memory_usage: data.server?.memory_usage || 0,
              disk_usage: data.server?.disk_usage || 0,
              uptime: data.server?.uptime || 0
            },
            contests_scheduler: {
              status: data.contests_scheduler?.status || 'running',
              last_check: data.contests_scheduler?.last_check || new Date().toISOString(),
              scheduled_tasks: data.contests_scheduler?.scheduled_tasks || 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const handleContestAction = (contest: Contest, action: 'start' | 'freeze' | 'end' | 'emergency_stop') => {
    setSelectedContest(contest);
    setControlDialog({ open: true, action });
  };

  const executeContestAction = async () => {
    if (!selectedContest || !controlDialog.action) return;

    setLoading(true);
    
    try {
      let endpoint = '';
      switch (controlDialog.action) {
        case 'start':
          endpoint = `/api/admin/contests/${selectedContest.id}/start`;
          break;
        case 'freeze':
          endpoint = `/api/admin/contests/${selectedContest.id}/freeze`;
          break;
        case 'end':
          endpoint = `/api/admin/contests/${selectedContest.id}/end`;
          break;
        case 'emergency_stop':
          endpoint = `/api/admin/contests/${selectedContest.id}/emergency-stop`;
          break;
        default:
          throw new Error('Invalid action');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh contests to get updated data
          await fetchContests();
          setControlDialog({ open: false, action: null });
          setSelectedContest(null);
        } else {
          console.error('Contest action failed:', result.message);
        }
      } else {
        console.error('Contest action request failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to execute contest action:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'frozen': return 'warning';
      case 'ended': return 'default';
      case 'not_started': return 'info';
      default: return 'default';
    }
  };

  const getSystemHealthColor = () => {
    const { server, database, judge_queue } = systemStatus;
    if (database.status === 'disconnected' || server.cpu_usage > 90 || server.memory_usage > 95) {
      return 'error';
    }
    if (database.status === 'slow' || server.cpu_usage > 70 || judge_queue.pending > 50) {
      return 'warning';
    }
    return 'success';
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Box>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Contest Control Panel
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Contest Controls */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Contest Controls
                </Typography>
                <Button
                  size="small"
                  onClick={fetchContests}
                >
                  ↻ Refresh
                </Button>
              </Box>

              {contests.length === 0 ? (
                <Alert severity="info">No contests available for control</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {contests.map((contest) => (
                    <Card key={contest.id} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {contest.contest_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <Chip
                                label={contest.status.replace('_', ' ')}
                                color={getStatusColor(contest.status) as any}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {contest.teams_count} teams • Code: {contest.registration_code}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Control Buttons */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {contest.status === 'not_started' && (
                              <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleContestAction(contest, 'start')}
                                size="small"
                              >
                                ▶ Start
                              </Button>
                            )}
                            
                            {contest.status === 'running' && (
                              <>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={() => handleContestAction(contest, 'freeze')}
                                  size="small"
                                >
                                  ⏸ Freeze
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleContestAction(contest, 'end')}
                                  size="small"
                                >
                                  ⏹ End
                                </Button>
                              </>
                            )}
                            
                            {contest.status === 'frozen' && (
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => handleContestAction(contest, 'end')}
                                size="small"
                              >
                                ⏹ End
                              </Button>
                            )}

                            <Tooltip title="Emergency Stop">
                              <IconButton
                                color="error"
                                onClick={() => handleContestAction(contest, 'emergency_stop')}
                                size="small"
                              >
                                ⚠
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        {/* Progress Bar for Running Contests */}
                        {contest.status === 'running' && (
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Contest Progress
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {Math.floor(contest.time_remaining_seconds / 60)}m remaining
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={contest.progress_percentage}
                              color="success"
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* System Monitoring */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  System Monitor
                </Typography>
                <Chip
                  label={getSystemHealthColor() === 'success' ? 'Healthy' : 
                        getSystemHealthColor() === 'warning' ? 'Warning' : 'Critical'}
                  color={getSystemHealthColor()}
                  size="small"
                />
              </Box>

              <List dense>
                {/* Judge Queue Status */}
                <ListItem>
                  <ListItemIcon>
                    <Typography sx={{ color: systemStatus.judge_queue.pending > 20 ? 'error.main' : 'success.main' }}>⏱</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary="Judge Queue"
                    secondary={`${systemStatus.judge_queue.pending} pending, ${systemStatus.judge_queue.workers_active} workers`}
                  />
                </ListItem>

                {/* Database Status */}
                <ListItem>
                  <ListItemIcon>
                    <Typography sx={{ color: systemStatus.database.status === 'connected' ? 'success.main' : 'error.main' }}>💾</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary="Database"
                    secondary={`${systemStatus.database.status} (${systemStatus.database.response_time}ms)`}
                  />
                </ListItem>

                {/* Server Resources */}
                <ListItem>
                  <ListItemIcon>
                    <Typography sx={{ color: systemStatus.server.memory_usage > 80 ? 'warning.main' : 'success.main' }}>📊</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary="Server Resources"
                    secondary={
                      <span>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          CPU: {systemStatus.server.cpu_usage}% | RAM: {systemStatus.server.memory_usage}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(systemStatus.server.cpu_usage, systemStatus.server.memory_usage)}
                          color={systemStatus.server.cpu_usage > 80 || systemStatus.server.memory_usage > 80 ? 'warning' : 'success'}
                          sx={{ height: 3, mt: 0.5 }}
                        />
                      </span>
                    }
                  />
                </ListItem>

                {/* Contest Scheduler */}
                <ListItem>
                  <ListItemIcon>
                    <Typography sx={{ color: systemStatus.contests_scheduler.status === 'running' ? 'success.main' : 'error.main' }}>🕰</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary="Contest Scheduler"
                    secondary={`${systemStatus.contests_scheduler.status} (${systemStatus.contests_scheduler.scheduled_tasks} tasks)`}
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                {/* System Uptime */}
                <ListItem>
                  <ListItemIcon>
                    <Typography>⏲</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary="System Uptime"
                    secondary={formatUptime(systemStatus.server.uptime)}
                  />
                </ListItem>
              </List>

              {/* Quick System Actions */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={fetchSystemStatus}
                >
                  ↻ Refresh Status
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled
                >
                  ⚙ System Config
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Contest Action Confirmation Dialog */}
      <Dialog open={controlDialog.open} onClose={() => setControlDialog({ open: false, action: null })}>
        <DialogTitle>
          Confirm Contest Action
        </DialogTitle>
        <DialogContent>
          {selectedContest && controlDialog.action && (
            <Box>
              <Alert 
                severity={controlDialog.action === 'emergency_stop' ? 'error' : 'warning'}
                sx={{ mb: 2 }}
              >
                {controlDialog.action === 'start' && 'This will start the contest and allow team submissions.'}
                {controlDialog.action === 'freeze' && 'This will freeze the leaderboard. Teams can still submit but rankings will be hidden.'}
                {controlDialog.action === 'end' && 'This will end the contest immediately and stop accepting submissions.'}
                {controlDialog.action === 'emergency_stop' && 'This will immediately stop the contest and all related processes. Use only in emergencies.'}
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                <strong>Contest:</strong> {selectedContest.contest_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Current Status:</strong> {selectedContest.status.replace('_', ' ')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Registered Teams:</strong> {selectedContest.teams_count}
              </Typography>
              
              {controlDialog.action === 'start' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Make sure all problems and test cases are properly configured before starting.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setControlDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button
            onClick={executeContestAction}
            variant="contained"
            color={controlDialog.action === 'emergency_stop' ? 'error' : 
                   controlDialog.action === 'start' ? 'success' : 'warning'}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Confirm ${controlDialog.action?.replace('_', ' ')}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContestControlPanel;