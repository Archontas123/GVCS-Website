/**
 * System Monitoring Dashboard - Phase 2.5 Task 6
 * Comprehensive system monitoring with metrics and logs
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Speed,
  Storage,
  Memory,
  NetworkCheck,
  Timer,
  Error,
  Warning,
  CheckCircle,
  Refresh,
  Settings,
  ViewList,
  Timeline,
  Computer,
  CloudQueue,
  Visibility,
  Download,
  DeleteForever,
  MonitorHeart,
} from '@mui/icons-material';

interface SystemMetrics {
  cpu: {
    usage_percent: number;
    load_average: number[];
    cores: number;
  };
  memory: {
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    usage_percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
    connections_active: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
  uptime_seconds: number;
}

interface QueueStatus {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  workers_active: number;
  workers_total: number;
  avg_processing_time_seconds: number;
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  service: string;
  message: string;
  details?: any;
}

interface DatabaseStatus {
  status: 'connected' | 'disconnected' | 'slow';
  connections_active: number;
  connections_max: number;
  response_time_ms: number;
  queries_per_second: number;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: { usage_percent: 35, load_average: [1.2, 1.4, 1.1], cores: 4 },
    memory: { total_mb: 8192, used_mb: 5574, free_mb: 2618, usage_percent: 68 },
    disk: { total_gb: 500, used_gb: 210, free_gb: 290, usage_percent: 42 },
    network: { bytes_sent: 1024000000, bytes_received: 2048000000, connections_active: 45 },
    processes: { total: 156, running: 3, sleeping: 153 },
    uptime_seconds: 86400
  });

  const [queueStatus, setQueueStatus] = useState<QueueStatus[]>([
    {
      name: 'Judge Queue',
      pending: 15,
      processing: 3,
      completed: 1247,
      failed: 12,
      workers_active: 5,
      workers_total: 8,
      avg_processing_time_seconds: 1.8
    },
    {
      name: 'Notification Queue',
      pending: 2,
      processing: 1,
      completed: 856,
      failed: 3,
      workers_active: 2,
      workers_total: 3,
      avg_processing_time_seconds: 0.3
    }
  ]);

  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    status: 'connected',
    connections_active: 12,
    connections_max: 100,
    response_time_ms: 45,
    queries_per_second: 28
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: 'info',
      service: 'contest-scheduler',
      message: 'Contest auto-started successfully',
      details: { contest_id: 1, contest_name: 'ICPC Practice Round' }
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'warning',
      service: 'judge-queue',
      message: 'High queue backlog detected',
      details: { pending_submissions: 25 }
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      level: 'error',
      service: 'docker-executor',
      message: 'Container execution failed',
      details: { submission_id: 1245, error: 'timeout' }
    }
  ]);

  const [selectedTab, setSelectedTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchMetrics = async () => {
    try {
      // Mock API calls - replace with real monitoring API
      setMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage_percent: Math.max(10, Math.min(90, prev.cpu.usage_percent + Math.floor(Math.random() * 10) - 5))
        },
        memory: {
          ...prev.memory,
          usage_percent: Math.max(30, Math.min(95, prev.memory.usage_percent + Math.floor(Math.random() * 6) - 3))
        }
      }));

      setQueueStatus(prev => prev.map(queue => ({
        ...queue,
        pending: Math.max(0, queue.pending + Math.floor(Math.random() * 4) - 2),
        processing: Math.max(0, Math.min(queue.workers_active, queue.processing + Math.floor(Math.random() * 2) - 1))
      })));

      setDbStatus(prev => ({
        ...prev,
        response_time_ms: Math.max(20, Math.min(200, prev.response_time_ms + Math.floor(Math.random() * 20) - 10))
      }));

    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const getHealthStatus = () => {
    if (metrics.cpu.usage_percent > 90 || metrics.memory.usage_percent > 95 || dbStatus.status === 'disconnected') {
      return { status: 'critical', color: 'error' };
    }
    if (metrics.cpu.usage_percent > 70 || metrics.memory.usage_percent > 80 || queueStatus.some(q => q.pending > 50)) {
      return { status: 'warning', color: 'warning' };
    }
    return { status: 'healthy', color: 'success' };
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const filteredLogs = logs.filter(log => logFilter === 'all' || log.level === logFilter);
  const healthStatus = getHealthStatus();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          System Monitoring Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`System ${healthStatus.status}`}
            color={healthStatus.color as any}
            icon={healthStatus.status === 'healthy' ? <CheckCircle /> : 
                  healthStatus.status === 'warning' ? <Warning /> : <Error />}
            sx={{ textTransform: 'capitalize' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh"
          />
          <IconButton onClick={fetchMetrics} disabled={autoRefresh}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Computer sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                CPU Usage
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {metrics.cpu.usage_percent}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics.cpu.usage_percent}
              color={metrics.cpu.usage_percent > 80 ? 'error' : metrics.cpu.usage_percent > 60 ? 'warning' : 'success'}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Load: {metrics.cpu.load_average[0].toFixed(2)}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Memory sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Memory Usage
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {metrics.memory.usage_percent}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics.memory.usage_percent}
              color={metrics.memory.usage_percent > 85 ? 'error' : metrics.memory.usage_percent > 70 ? 'warning' : 'success'}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {formatBytes(metrics.memory.used_mb * 1024 * 1024)} / {formatBytes(metrics.memory.total_mb * 1024 * 1024)}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Storage sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Disk Usage
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {metrics.disk.usage_percent}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics.disk.usage_percent}
              color={metrics.disk.usage_percent > 90 ? 'error' : metrics.disk.usage_percent > 75 ? 'warning' : 'success'}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {metrics.disk.used_gb} GB / {metrics.disk.total_gb} GB
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Timer sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Uptime
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {formatUptime(metrics.uptime_seconds)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {metrics.processes.total} processes running
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Detailed Monitoring Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab label="Queue Status" />
            <Tab label="Database" />
            <Tab label="System Logs" />
            <Tab label="Configuration" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Queue Status Tab */}
          {selectedTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Queue Status & Workers
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 2 
              }}>
                {queueStatus.map((queue, index) => (
                  <Paper key={index} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {queue.name}
                      </Typography>
                      <Chip
                        label={`${queue.workers_active}/${queue.workers_total} workers`}
                        color={queue.workers_active === queue.workers_total ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: 2 
                    }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Pending</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{queue.pending}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Processing</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{queue.processing}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Completed</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{queue.completed}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Failed</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>{queue.failed}</Typography>
                      </Box>
                    </Box>
                      
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Avg. Processing Time: {queue.avg_processing_time_seconds.toFixed(1)}s
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (queue.pending / (queue.pending + queue.completed)) * 100)}
                        color={queue.pending > 20 ? 'error' : 'success'}
                        sx={{ mt: 1, height: 4 }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {/* Database Tab */}
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Database Status
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3 
              }}>
                <Box>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <NetworkCheck color={dbStatus.status === 'connected' ? 'success' : 'error'} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Connection Status"
                        secondary={dbStatus.status}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={dbStatus.status}
                          color={dbStatus.status === 'connected' ? 'success' : 'error'}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <Speed />
                      </ListItemIcon>
                      <ListItemText
                        primary="Response Time"
                        secondary={`${dbStatus.response_time_ms}ms average`}
                      />
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <CloudQueue />
                      </ListItemIcon>
                      <ListItemText
                        primary="Active Connections"
                        secondary={`${dbStatus.connections_active} / ${dbStatus.connections_max}`}
                      />
                      <ListItemSecondaryAction>
                        <LinearProgress
                          variant="determinate"
                          value={(dbStatus.connections_active / dbStatus.connections_max) * 100}
                          sx={{ width: 60, height: 6 }}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <Timeline />
                      </ListItemIcon>
                      <ListItemText
                        primary="Queries per Second"
                        secondary={dbStatus.queries_per_second.toString()}
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box>
                  <Alert severity={dbStatus.status === 'connected' ? 'success' : 'error'}>
                    Database is {dbStatus.status === 'connected' ? 'operating normally' : 'experiencing issues'}
                  </Alert>
                </Box>
              </Box>
            </Box>
          )}

          {/* System Logs Tab */}
          {selectedTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent System Logs
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Filter</InputLabel>
                    <Select
                      value={logFilter}
                      label="Filter"
                      onChange={(e) => setLogFilter(e.target.value as any)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="error">Errors</MenuItem>
                      <MenuItem value="warning">Warnings</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                    </Select>
                  </FormControl>
                  <Button size="small" startIcon={<Download />}>Export</Button>
                  <Button size="small" startIcon={<DeleteForever />} color="error">Clear</Button>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(log.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.level}
                            color={getLogLevelColor(log.level) as any}
                            size="small"
                            sx={{ textTransform: 'uppercase' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {log.service}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Configuration Tab */}
          {selectedTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Monitoring Configuration
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                gap: 3 
              }}>
                <Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Refresh Interval</InputLabel>
                    <Select
                      value={refreshInterval}
                      label="Refresh Interval"
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    >
                      <MenuItem value={1}>1 second</MenuItem>
                      <MenuItem value={5}>5 seconds</MenuItem>
                      <MenuItem value={10}>10 seconds</MenuItem>
                      <MenuItem value={30}>30 seconds</MenuItem>
                      <MenuItem value={60}>1 minute</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="CPU Alert Threshold (%)"
                    type="number"
                    defaultValue={80}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Memory Alert Threshold (%)"
                    type="number"
                    defaultValue={85}
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Alert Settings
                  </Typography>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Email notifications"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="High CPU alerts"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Memory alerts"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="Disk space alerts"
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button variant="contained" sx={{ mr: 2 }}>
                  Save Configuration
                </Button>
                <Button variant="outlined">
                  Reset to Defaults
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemMonitoringDashboard;