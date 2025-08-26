/**
 * Admin Layout Component - Phase 2.5 Task 1
 * Enhanced admin dashboard layout with sidebar navigation
 */

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Alert,
  Avatar,
  Stack,
  Paper,
  alpha,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const drawerWidth = 280;

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  alerts?: Array<{
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
  }>;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title = 'Admin Dashboard',
  actions,
  alerts = []
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [systemStatus] = useState({
    contests_running: 2,
    pending_submissions: 15,
    active_teams: 45,
    system_health: 'healthy' as 'healthy' | 'warning' | 'error'
  });

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📈',
    },
    {
      label: 'Contests',
      path: '/admin/contests',
      icon: '🏆',
      badge: systemStatus.contests_running
    },
    {
      label: 'Problems',
      path: '/admin/problems',
      icon: '❓',
    },
    {
      label: 'Teams',
      path: '/admin/teams',
      icon: '👥',
      badge: systemStatus.active_teams
    },
    {
      label: 'Submissions',
      path: '/admin/submissions',
      icon: '📊',
      badge: systemStatus.pending_submissions
    },
    {
      label: 'System Monitor',
      path: '/admin/monitor',
      icon: '💻',
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
    handleMenuClose();
  };

  const getSystemStatusColor = () => {
    switch (systemStatus.system_health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const drawer = (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)',
        color: 'white',
        borderRight: '1px solid rgba(59, 130, 246, 0.3)'
      }}
    >
      {/* Sidebar Header */}
      <Box 
        sx={{ 
          p: 2.5, 
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(30, 58, 138, 0.3)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Typography sx={{ color: 'white', fontSize: 18 }}>⚙</Typography>
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              color: '#ffffff',
              fontSize: '1.1rem'
            }}
          >
            Admin Panel
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <List sx={{ px: 2 }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.2,
                    px: 1.5,
                    minHeight: 48,
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                    border: isActive ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: 40,
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    {item.badge ? (
                      <Badge 
                        badgeContent={item.badge} 
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#f56565',
                            color: 'white',
                            fontSize: '0.75rem',
                            minWidth: '16px',
                            height: '16px'
                          }
                        }}
                        max={99}
                      >
                        <Typography sx={{ fontSize: 20 }}>{item.icon}</Typography>
                      </Badge>
                    ) : (
                      <Typography sx={{ fontSize: 20 }}>{item.icon}</Typography>
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.9rem'
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Bottom Section */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <ListItemButton
          onClick={handleMenuOpen}
          sx={{
            borderRadius: 1.5,
            py: 1,
            px: 1.5,
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255, 255, 255, 0.8)' }}>
            <Typography sx={{ fontSize: 20 }}>⚙</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="Settings"
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.9rem'
              },
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
        }}
      >
        <Toolbar sx={{ py: 0.5 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              color: 'rgba(255, 255, 255, 0.9)',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.2)'
              }
            }}
          >
            ☰
          </IconButton>
          
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              color: '#ffffff',
              fontSize: '1.25rem'
            }}
          >
            {title}
          </Typography>

          {/* System Status Indicator */}
          <Chip
            label={`${systemStatus.contests_running} Active`}
            size="small"
            sx={{
              mr: 2,
              backgroundColor: 'rgba(34, 197, 94, 0.9)',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.75rem'
            }}
          />

          {/* Notifications */}
          <IconButton 
            sx={{ 
              mr: 1,
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#ffffff'
              }
            }}
          >
            <Badge 
              badgeContent={systemStatus.pending_submissions} 
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#f56565',
                  color: 'white',
                  fontSize: '0.75rem'
                }
              }}
              max={99}
            >
              <Typography sx={{ fontSize: 20 }}>🔔</Typography>
            </Badge>
          </IconButton>

          {/* Actions */}
          {actions && (
            <Box sx={{ mr: 1 }}>
              {actions}
            </Box>
          )}

          {/* User Menu */}
          <IconButton
            onClick={handleMenuOpen}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#ffffff'
              }
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.875rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 600
              }}
            >
              {admin?.username?.charAt(0)?.toUpperCase()}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                borderRadius: 2,
                minWidth: 180,
                backgroundColor: '#1e3a8a',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                '& .MuiMenuItem-root': {
                  py: 1.5,
                  px: 2,
                  color: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)'
                  }
                }
              }
            }}
          >
            <MenuItem onClick={() => { navigate('/admin/settings'); handleMenuClose(); }}>
              <Typography sx={{ mr: 1.5, fontSize: 18 }}>⚙</Typography>
              <Typography sx={{ fontSize: '0.9rem' }}>Settings</Typography>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(59, 130, 246, 0.3)' }} />
            <MenuItem onClick={handleLogout}>
              <Typography sx={{ mr: 1.5, fontSize: 18 }}>→</Typography>
              <Typography sx={{ fontSize: '0.9rem' }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <IconButton onClick={handleDrawerToggle}>
              ←
            </IconButton>
          </Box>
          <Divider />
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        
        {/* Alerts */}
        {alerts.length > 0 && (
          <Box sx={{ p: 3, pb: 0 }}>
            {alerts.map((alert, index) => (
              <Alert 
                key={index} 
                severity={alert.type} 
                sx={{ 
                  mb: 2,
                  borderRadius: 1.5
                }}
              >
                {alert.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Page Content */}
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;