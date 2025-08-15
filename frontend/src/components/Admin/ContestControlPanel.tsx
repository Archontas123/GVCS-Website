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
import {
  PlayArrow,
  Pause,
  Stop,
  Emergency,
  Refresh,
  Settings,
  Speed,
  Storage,
  Memory,
  NetworkCheck,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  Timer,
  EmojiEvents,
} from '@mui/icons-material';

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
    judge_queue: { pending: 15, processing: 3, workers_active: 5, avg_processing_time: 1.8 },
    database: { status: 'connected', connections: 12, response_time: 45 },
    server: { cpu_usage: 35, memory_usage: 68, disk_usage: 42, uptime: 86400 },
    contests_scheduler: { status: 'running', last_check: new Date().toISOString(), scheduled_tasks: 3 }
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
      // Mock API call
      const mockContests: Contest[] = [
        {
          id: 1,
          contest_name: 'ICPC Practice Round',
          status: 'running',
          start_time: new Date(Date.now() - 3600000).toISOString(),
          duration: 180,
          time_remaining_seconds: 6300,
          progress_percentage: 35.4,
          teams_count: 24,
          registration_code: 'ICPC2024'
        },
        {
          id: 2,
          contest_name: 'Beginner Programming Contest',
          status: 'not_started',
          start_time: new Date(Date.now() + 1800000).toISOString(),
          duration: 90,
          time_remaining_seconds: 0,
          progress_percentage: 0,
          teams_count: 16,
          registration_code: 'BEGIN01'
        }
      ];
      setContests(mockContests);
    } catch (error) {
      console.error('Failed to fetch contests:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      // Mock API call - in real app, this would fetch actual system metrics
      setSystemStatus(prev => ({
        ...prev,
        judge_queue: {
          ...prev.judge_queue,
          pending: Math.max(0, prev.judge_queue.pending + Math.floor(Math.random() * 5) - 2)
        },
        server: {
          ...prev.server,
          cpu_usage: Math.max(10, Math.min(90, prev.server.cpu_usage + Math.floor(Math.random() * 10) - 5)),
          memory_usage: Math.max(30, Math.min(95, prev.server.memory_usage + Math.floor(Math.random() * 6) - 3))
        }
      }));
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
      // Mock API call - replace with real API
      console.log(`${controlDialog.action} contest:`, selectedContest.contest_name);
      
      // Update local state
      const newStatus = controlDialog.action === 'start' ? 'running' : 
                       controlDialog.action === 'freeze' ? 'frozen' : 'ended';
      
      setContests(prev => prev.map(contest => 
        contest.id === selectedContest.id 
          ? { ...contest, status: newStatus }
          : contest
      ));

      setControlDialog({ open: false, action: null });
      setSelectedContest(null);
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
                  startIcon={<Refresh />}
                  onClick={fetchContests}
                >
                  Refresh
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
                                startIcon={<PlayArrow />}
                                onClick={() => handleContestAction(contest, 'start')}
                                size="small"
                              >
                                Start
                              </Button>
                            )}
                            
                            {contest.status === 'running' && (
                              <>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  startIcon={<Pause />}
                                  onClick={() => handleContestAction(contest, 'freeze')}
                                  size="small"
                                >
                                  Freeze
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Stop />}
                                  onClick={() => handleContestAction(contest, 'end')}
                                  size="small"
                                >
                                  End
                                </Button>
                              </>
                            )}
                            
                            {contest.status === 'frozen' && (
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Stop />}
                                onClick={() => handleContestAction(contest, 'end')}
                                size="small"
                              >
                                End
                              </Button>
                            )}

                            <Tooltip title="Emergency Stop">
                              <IconButton
                                color="error"
                                onClick={() => handleContestAction(contest, 'emergency_stop')}
                                size="small"
                              >
                                <Emergency />
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
                    <Speed color={systemStatus.judge_queue.pending > 20 ? 'error' : 'success'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Judge Queue"
                    secondary={`${systemStatus.judge_queue.pending} pending, ${systemStatus.judge_queue.workers_active} workers`}
                  />
                </ListItem>

                {/* Database Status */}
                <ListItem>
                  <ListItemIcon>
                    <Storage color={systemStatus.database.status === 'connected' ? 'success' : 'error'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Database"
                    secondary={`${systemStatus.database.status} (${systemStatus.database.response_time}ms)`}
                  />
                </ListItem>

                {/* Server Resources */}
                <ListItem>
                  <ListItemIcon>
                    <Memory color={systemStatus.server.memory_usage > 80 ? 'warning' : 'success'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Server Resources"
                    secondary={
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          CPU: {systemStatus.server.cpu_usage}% | RAM: {systemStatus.server.memory_usage}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(systemStatus.server.cpu_usage, systemStatus.server.memory_usage)}
                          color={systemStatus.server.cpu_usage > 80 || systemStatus.server.memory_usage > 80 ? 'warning' : 'success'}
                          sx={{ height: 3, mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>

                {/* Contest Scheduler */}
                <ListItem>
                  <ListItemIcon>
                    <Schedule color={systemStatus.contests_scheduler.status === 'running' ? 'success' : 'error'} />
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
                    <Timer />
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
                  startIcon={<Refresh />}
                  onClick={fetchSystemStatus}
                >
                  Refresh Status
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Settings />}
                  disabled
                >
                  System Config
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