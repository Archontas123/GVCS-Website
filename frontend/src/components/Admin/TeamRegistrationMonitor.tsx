/**
 * Team Registration Monitor - Phase 2.5 Task 3
 * Real-time team registration monitoring and management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  People,
  PersonAdd,
  Check,
  Close,
  MoreVert,
  Refresh,
  Block,
  RestartAlt,
  Visibility,
  Error,
  Warning,
  Schedule,
  GroupAdd,
  Help,
} from '@mui/icons-material';

interface TeamRegistration {
  id: number;
  team_name: string;
  contest_code: string;
  contest_name: string;
  registered_at: string;
  last_activity: string;
  is_active: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  session_token?: string;
  ip_address?: string;
  validation_errors?: string[];
}

interface RegistrationStats {
  total_registrations: number;
  pending_approvals: number;
  active_teams: number;
  registrations_today: number;
  recent_activity: number;
}

const TeamRegistrationMonitor: React.FC = () => {
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [stats, setStats] = useState<RegistrationStats>({
    total_registrations: 0,
    pending_approvals: 0,
    active_teams: 0,
    registrations_today: 0,
    recent_activity: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamRegistration | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'reset' | 'view' | null;
  }>({ open: false, action: null });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock data - in real app, this would come from WebSocket or polling API
  useEffect(() => {
    fetchRegistrations();
    const interval = setInterval(fetchRegistrations, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRegistrations = async () => {
    try {
      // Mock API call - replace with real API
      const mockRegistrations: TeamRegistration[] = [
        {
          id: 1,
          team_name: 'Code Warriors',
          contest_code: 'ICPC2024',
          contest_name: 'ICPC Practice Round',
          registered_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          last_activity: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
          is_active: true,
          status: 'active',
          ip_address: '192.168.1.100'
        },
        {
          id: 2,
          team_name: 'Algorithm Masters',
          contest_code: 'ICPC2024',
          contest_name: 'ICPC Practice Round',
          registered_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          last_activity: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          is_active: true,
          status: 'pending',
          validation_errors: ['Team name may be duplicate']
        },
        {
          id: 3,
          team_name: 'Debug Demons',
          contest_code: 'BEGIN01',
          contest_name: 'Beginner Programming Contest',
          registered_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          last_activity: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
          is_active: true,
          status: 'active',
          ip_address: '192.168.1.101'
        }
      ];

      setRegistrations(mockRegistrations);
      setStats({
        total_registrations: 45,
        pending_approvals: 3,
        active_teams: 42,
        registrations_today: 12,
        recent_activity: 8
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, team: TeamRegistration) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  const handleAction = (action: 'approve' | 'reject' | 'reset' | 'view') => {
    setActionDialog({ open: true, action });
    handleMenuClose();
  };

  const executeAction = async () => {
    if (!selectedTeam || !actionDialog.action) return;

    try {
      // Mock API call - replace with real API
      console.log(`${actionDialog.action} team:`, selectedTeam.team_name);
      
      // Update local state
      setRegistrations(prev => prev.map(reg => 
        reg.id === selectedTeam.id 
          ? { ...reg, status: actionDialog.action === 'approve' ? 'active' : 'rejected' }
          : reg
      ));

      setActionDialog({ open: false, action: null });
      setSelectedTeam(null);
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Check />;
      case 'pending': return <Schedule />;
      case 'rejected': return <Close />;
      case 'inactive': return <Block />;
      default: return <Help />;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredRegistrations = registrations.filter(reg => {
    switch (selectedTab) {
      case 0: return true; // All
      case 1: return reg.status === 'pending';
      case 2: return reg.status === 'active';
      case 3: return reg.status === 'rejected' || reg.status === 'inactive';
      default: return true;
    }
  });

  return (
    <Box>
      {/* Header with Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Team Registration Monitor
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchRegistrations}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Badge badgeContent={stats.recent_activity} color="error">
              <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
            </Badge>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {stats.total_registrations}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Registrations
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Warning sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {stats.pending_approvals}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Approvals
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Check sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {stats.active_teams}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Teams
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <GroupAdd sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {stats.registrations_today}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Today's Registrations
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs and Table */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab label={`All (${registrations.length})`} />
            <Tab 
              label={
                <Badge badgeContent={registrations.filter(r => r.status === 'pending').length} color="error">
                  Pending
                </Badge>
              }
            />
            <Tab label={`Active (${registrations.filter(r => r.status === 'active').length})`} />
            <Tab label={`Rejected (${registrations.filter(r => r.status === 'rejected').length})`} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell>Contest</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Registered</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                            {registration.team_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {registration.team_name}
                            </Typography>
                            {registration.validation_errors && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Error sx={{ fontSize: 14, color: 'error.main', mr: 0.5 }} />
                                <Typography variant="caption" color="error">
                                  {registration.validation_errors[0]}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {registration.contest_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {registration.contest_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={registration.status}
                          color={getStatusColor(registration.status) as any}
                          size="small"
                          icon={getStatusIcon(registration.status)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimeAgo(registration.registered_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatTimeAgo(registration.last_activity)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small"
                          onClick={(e) => handleMenuOpen(e, registration)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTeam?.status === 'pending' && [
          <MenuItem key="approve" onClick={() => handleAction('approve')}>
            <Check sx={{ mr: 1, color: 'success.main' }} />
            Approve Team
          </MenuItem>,
          <MenuItem key="reject" onClick={() => handleAction('reject')}>
            <Close sx={{ mr: 1, color: 'error.main' }} />
            Reject Team
          </MenuItem>
        ]}
        <MenuItem onClick={() => handleAction('view')}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleAction('reset')}>
          <RestartAlt sx={{ mr: 1 }} />
          Reset Session
        </MenuItem>
      </Menu>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onClose={() => setActionDialog({ open: false, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'approve' && 'Approve Team Registration'}
          {actionDialog.action === 'reject' && 'Reject Team Registration'}
          {actionDialog.action === 'reset' && 'Reset Team Session'}
          {actionDialog.action === 'view' && 'Team Details'}
        </DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Team:</strong> {selectedTeam.team_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Contest:</strong> {selectedTeam.contest_name} ({selectedTeam.contest_code})
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Registered:</strong> {new Date(selectedTeam.registered_at).toLocaleString()}
              </Typography>
              {selectedTeam.ip_address && (
                <Typography variant="body1" gutterBottom>
                  <strong>IP Address:</strong> {selectedTeam.ip_address}
                </Typography>
              )}
              {selectedTeam.validation_errors && selectedTeam.validation_errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Validation Issues:</strong>
                  <ul>
                    {selectedTeam.validation_errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {actionDialog.action === 'approve' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  This team will be approved and can participate in the contest.
                </Alert>
              )}
              {actionDialog.action === 'reject' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This team will be rejected and cannot participate.
                </Alert>
              )}
              {actionDialog.action === 'reset' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will invalidate the team's current session and require them to login again.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, action: null })}>
            Cancel
          </Button>
          {actionDialog.action !== 'view' && (
            <Button 
              onClick={executeAction}
              variant="contained"
              color={actionDialog.action === 'reject' ? 'error' : 'primary'}
            >
              {actionDialog.action === 'approve' && 'Approve'}
              {actionDialog.action === 'reject' && 'Reject'}
              {actionDialog.action === 'reset' && 'Reset Session'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamRegistrationMonitor;