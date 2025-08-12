/**
 * CS Club Hackathon Platform - Connection Status Component
 * Phase 5.5: Real-time Connection Health Display
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Grid,
  Paper,
  Collapse,
  Alert,
  Button,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Warning,
  Error as ErrorIcon,
  Refresh,
  Info,
  ExpandMore,
  ExpandLess,
  SignalWifi4Bar,
  SignalWifiConnectedNoInternet4,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ConnectionStatusProps {
  compact?: boolean;
  showDetails?: boolean;
  onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  compact = false,
  showDetails = false,
  onReconnect,
}) => {
  const theme = useTheme();
  const { connectionStatus, connectionHealth, connect, disconnect } = useWebSocket();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Get status display info
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi />,
          color: theme.palette.success.main,
          text: 'Connected',
          description: 'Real-time updates active',
        };
      case 'connecting':
        return {
          icon: <SignalWifi4Bar />,
          color: theme.palette.info.main,
          text: 'Connecting',
          description: 'Establishing connection...',
        };
      case 'reconnecting':
        return {
          icon: <SignalWifiConnectedNoInternet4 />,
          color: theme.palette.warning.main,
          text: 'Reconnecting',
          description: `Attempt ${connectionHealth.reconnectAttempts}`,
        };
      case 'disconnected':
        return {
          icon: <WifiOff />,
          color: theme.palette.grey[500],
          text: 'Disconnected',
          description: 'No real-time updates',
        };
      case 'error':
        return {
          icon: <ErrorIcon />,
          color: theme.palette.error.main,
          text: 'Connection Error',
          description: 'Failed to connect',
        };
      default:
        return {
          icon: <Warning />,
          color: theme.palette.grey[500],
          text: 'Unknown',
          description: 'Unknown status',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const lastPingTime = connectionHealth.lastPing > 0 ? new Date(connectionHealth.lastPing) : null;

  // Handle reconnection
  const handleReconnect = () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      connect();
    }
    if (onReconnect) {
      onReconnect();
    }
  };

  // Compact display
  if (compact) {
    return (
      <Tooltip title={`${statusInfo.text} - ${statusInfo.description}`}>
        <Chip
          icon={statusInfo.icon}
          label={statusInfo.text}
          size="small"
          sx={{
            color: 'white',
            bgcolor: statusInfo.color,
            '& .MuiChip-icon': { color: 'white' },
          }}
          onClick={() => setDetailsOpen(true)}
        />
      </Tooltip>
    );
  }

  return (
    <Box>
      {/* Status Display */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          border: `2px solid ${statusInfo.color}`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </Box>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {statusInfo.text}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {statusInfo.description}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <Tooltip title="Reconnect">
                <IconButton size="small" onClick={handleReconnect} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            
            {showDetails && (
              <Tooltip title="Connection Details">
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Connection Progress for connecting/reconnecting states */}
        {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress color="primary" />
          </Box>
        )}

        {/* Expanded Details */}
        {showDetails && (
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {connectionHealth.status}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Authenticated
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {connectionHealth.isAuthenticated ? 'Yes' : 'No'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Reconnect Attempts
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {connectionHealth.reconnectAttempts}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Queued Events
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {connectionHealth.queuedEvents}
                  </Typography>
                </Grid>
                
                {lastPingTime && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Last Ping
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDistanceToNow(lastPingTime)} ago
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        )}
      </Paper>

      {/* Alerts for various states */}
      {connectionStatus === 'error' && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleReconnect}>
              Retry
            </Button>
          }
        >
          Connection failed. Real-time updates are disabled.
        </Alert>
      )}

      {connectionStatus === 'disconnected' && (
        <Alert 
          severity="warning" 
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleReconnect}>
              Connect
            </Button>
          }
        >
          Not connected. Click to enable real-time updates.
        </Alert>
      )}

      {connectionHealth.queuedEvents > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {connectionHealth.queuedEvents} events queued for when connection is restored.
        </Alert>
      )}

      {/* Detailed Connection Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </Box>
          Connection Status
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Current Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ color: statusInfo.color }}>
                    {statusInfo.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {statusInfo.text}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {statusInfo.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Authentication
              </Typography>
              <Typography variant="body1">
                {connectionHealth.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Reconnection Attempts
              </Typography>
              <Typography variant="body1">
                {connectionHealth.reconnectAttempts} / 5
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Queued Events
              </Typography>
              <Typography variant="body1">
                {connectionHealth.queuedEvents} pending
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Connection Health
              </Typography>
              <Typography variant="body1">
                {lastPingTime ? 
                  `Last ping: ${formatDistanceToNow(lastPingTime)} ago` :
                  'No ping data'
                }
              </Typography>
            </Grid>

            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={handleReconnect}
                  fullWidth
                >
                  Reconnect Now
                </Button>
              </Grid>
            )}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ConnectionStatus;