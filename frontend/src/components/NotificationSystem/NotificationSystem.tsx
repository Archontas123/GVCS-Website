/**
 * CS Club Hackathon Platform - Notification System Component
 * Phase 5.5: Real-time contest notifications and alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  AlertTitle,
  Typography,
  IconButton,
  Slide,
  Fade,
  Stack,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Close,
  Notifications,
  NotificationsActive,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Schedule,
  EmojiEvents,
  Timer,
  Speed,
  PlayArrow,
  Stop,
  Pause,
  VolumeOff,
  VolumeUp,
  MarkAsUnread,
  ClearAll,
  Settings,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeData } from '../../hooks/useWebSocket';
import { SystemNotification } from '../../services/websocket';

interface NotificationSystemProps {
  contestId?: number;
  showInDrawer?: boolean;
  soundEnabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHideDuration?: number;
}

interface NotificationState {
  id: string;
  notification: SystemNotification;
  isVisible: boolean;
  isPersistent: boolean;
  hasBeenSeen: boolean;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  contestId,
  showInDrawer = false,
  soundEnabled = true,
  position = 'top-right',
  maxVisible = 3,
  autoHideDuration = 6000,
}) => {
  const theme = useTheme();
  const { notifications, clearNotifications, markNotificationRead } = useRealTimeData(contestId);
  
  const [notificationStates, setNotificationStates] = useState<NotificationState[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(!soundEnabled);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Process new notifications
  useEffect(() => {
    notifications.forEach(notification => {
      const existingState = notificationStates.find(state => 
        state.notification.timestamp === notification.timestamp
      );
      
      if (!existingState) {
        const newState: NotificationState = {
          id: `notification-${Date.now()}-${Math.random()}`,
          notification,
          isVisible: true,
          isPersistent: notification.autoClose === false,
          hasBeenSeen: false,
        };
        
        setNotificationStates(prev => [newState, ...prev]);
        
        // Play sound for important notifications
        if (!soundMuted && (notification.type === 'warning' || notification.type === 'error')) {
          playNotificationSound(notification.type);
        }
        
        // Auto-hide non-persistent notifications
        if (!newState.isPersistent) {
          setTimeout(() => {
            setNotificationStates(prev => 
              prev.map(state => 
                state.id === newState.id 
                  ? { ...state, isVisible: false }
                  : state
              )
            );
            
            // Remove completely after animation
            setTimeout(() => {
              setNotificationStates(prev => 
                prev.filter(state => state.id !== newState.id)
              );
            }, 300);
          }, autoHideDuration);
        }
      }
    });
  }, [notifications, notificationStates, soundMuted, autoHideDuration]);

  // Update unread count
  useEffect(() => {
    const unread = notificationStates.filter(state => !state.hasBeenSeen).length;
    setUnreadCount(unread);
  }, [notificationStates]);

  // Play notification sound
  const playNotificationSound = (type: string) => {
    try {
      const audio = new Audio();
      // Different sounds for different notification types
      switch (type) {
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified error sound
          break;
        case 'warning':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified warning sound
          break;
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified success sound
          break;
        default:
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBjq...'; // Simplified default sound
      }
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (e.g., user hasn't interacted with page yet)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'error':
        return <ErrorIcon />;
      case 'info':
      default:
        return <Info />;
    }
  };

  // Get notification severity
  const getNotificationSeverity = (type: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  };

  // Handle notification close
  const handleCloseNotification = (notificationId: string) => {
    setNotificationStates(prev => 
      prev.map(state => 
        state.id === notificationId 
          ? { ...state, isVisible: false }
          : state
      )
    );
    
    setTimeout(() => {
      setNotificationStates(prev => 
        prev.filter(state => state.id !== notificationId)
      );
    }, 300);
  };

  // Mark notification as seen
  const markAsSeen = (notificationId: string) => {
    setNotificationStates(prev => 
      prev.map(state => 
        state.id === notificationId 
          ? { ...state, hasBeenSeen: true }
          : state
      )
    );
  };

  // Get visible notifications for display
  const visibleNotifications = notificationStates
    .filter(state => state.isVisible)
    .slice(0, maxVisible);

  // Get position styles
  const getPositionStyles = () => {
    const base = { position: 'fixed', zIndex: 1400 };
    switch (position) {
      case 'top-right':
        return { ...base, top: 24, right: 24 };
      case 'top-left':
        return { ...base, top: 24, left: 24 };
      case 'bottom-right':
        return { ...base, bottom: 24, right: 24 };
      case 'bottom-left':
        return { ...base, bottom: 24, left: 24 };
      default:
        return { ...base, top: 24, right: 24 };
    }
  };

  return (
    <Box>
      {/* Notification Bell Icon */}
      <IconButton
        color="inherit"
        onClick={() => setDrawerOpen(true)}
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsActive /> : <Notifications />}
        </Badge>
      </IconButton>

      {/* Floating Notifications */}
      {!showInDrawer && (
        <Box sx={getPositionStyles()}>
          <Stack spacing={1} direction="column-reverse">
            {visibleNotifications.map((notificationState, index) => (
              <Slide
                key={notificationState.id}
                direction={position.includes('right') ? 'left' : 'right'}
                in={notificationState.isVisible}
                timeout={300}
              >
                <Card
                  elevation={6}
                  sx={{
                    minWidth: 300,
                    maxWidth: 400,
                    opacity: notificationState.hasBeenSeen ? 0.8 : 1,
                  }}
                  onMouseEnter={() => markAsSeen(notificationState.id)}
                >
                  <Alert
                    severity={getNotificationSeverity(notificationState.notification.type)}
                    action={
                      <IconButton
                        size="small"
                        onClick={() => handleCloseNotification(notificationState.id)}
                      >
                        <Close />
                      </IconButton>
                    }
                    sx={{ width: '100%' }}
                  >
                    <AlertTitle>{notificationState.notification.title}</AlertTitle>
                    <Typography variant="body2">
                      {notificationState.notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {formatDistanceToNow(new Date(notificationState.notification.timestamp))} ago
                    </Typography>
                  </Alert>
                </Card>
              </Slide>
            ))}
          </Stack>
        </Box>
      )}

      {/* Notification Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 400, maxWidth: '90vw' }
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications />
              Notifications
              {unreadCount > 0 && (
                <Chip 
                  label={unreadCount} 
                  size="small" 
                  sx={{ bgcolor: 'error.main', color: 'white' }}
                />
              )}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setSoundMuted(!soundMuted)}
                sx={{ color: 'white' }}
              >
                {soundMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              
              <IconButton
                size="small"
                onClick={() => setSettingsOpen(true)}
                sx={{ color: 'white' }}
              >
                <Settings />
              </IconButton>
              
              <IconButton
                size="small"
                onClick={() => setDrawerOpen(false)}
                sx={{ color: 'white' }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notificationStates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Notifications sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List>
              {notificationStates.map((notificationState, index) => (
                <React.Fragment key={notificationState.id}>
                  <ListItem
                    sx={{
                      bgcolor: notificationState.hasBeenSeen ? 'transparent' : 'action.hover',
                      opacity: notificationState.isVisible ? 1 : 0.5,
                    }}
                    onMouseEnter={() => markAsSeen(notificationState.id)}
                  >
                    <ListItemIcon>
                      <Box sx={{ color: `${notificationState.notification.type}.main` }}>
                        {getNotificationIcon(notificationState.notification.type)}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {notificationState.notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {notificationState.notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notificationState.notification.timestamp))} ago
                          </Typography>
                        </Box>
                      }
                    />
                    
                    {!notificationState.hasBeenSeen && (
                      <Badge color="primary" variant="dot" />
                    )}
                  </ListItem>
                  
                  {index < notificationStates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {notificationStates.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearAll />}
              onClick={() => {
                setNotificationStates([]);
                clearNotifications();
              }}
            >
              Clear All Notifications
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Notification Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body1">Sound Notifications</Typography>
              <IconButton onClick={() => setSoundMuted(!soundMuted)}>
                {soundMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Configure notification preferences for different types of contest events:
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="body2">Contest events (start, end, freeze)</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" />
              <Typography variant="body2">Time warnings (30 min, 5 min)</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents color="primary" />
              <Typography variant="body2">Balloon awards and achievements</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon color="error" />
              <Typography variant="body2">System errors and issues</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationSystem;