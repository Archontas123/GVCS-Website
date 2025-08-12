/**
 * CS Club Hackathon Platform - Header Component
 * Phase 1.4: Responsive header with contest timer and navigation
 */

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Timer,
  Code,
  Dashboard,
  Leaderboard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NotificationSystem from '../NotificationSystem';
import ConnectionStatus from '../ConnectionStatus';

interface HeaderProps {
  teamName?: string;
  contestName?: string;
  timeRemaining?: number; // seconds
  isAuthenticated: boolean;
  onLogout: () => void;
  contestId?: number;
}

const Header: React.FC<HeaderProps> = ({
  teamName,
  contestName,
  timeRemaining,
  isAuthenticated,
  onLogout,
  contestId,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [displayTime, setDisplayTime] = useState<string>('');

  // Format time remaining
  useEffect(() => {
    if (timeRemaining !== undefined && timeRemaining > 0) {
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      setDisplayTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else if (timeRemaining === 0) {
      setDisplayTime('Contest Ended');
    } else {
      setDisplayTime('');
    }
  }, [timeRemaining]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  const getTimerColor = (): string => {
    if (!timeRemaining || timeRemaining <= 0) return theme.palette.error.main;
    if (timeRemaining < 1800) return theme.palette.error.main; // < 30 minutes
    if (timeRemaining < 3600) return theme.palette.warning.main; // < 1 hour
    return theme.palette.success.main;
  };

  const NavigationButtons = () => (
    <>
      <Button
        color="inherit"
        startIcon={<Dashboard />}
        onClick={() => handleNavigation('/dashboard')}
        sx={{ mx: 1 }}
      >
        Dashboard
      </Button>
      <Button
        color="inherit"
        startIcon={<Leaderboard />}
        onClick={() => handleNavigation('/leaderboard')}
        sx={{ mx: 1 }}
      >
        Leaderboard
      </Button>
    </>
  );

  const MobileMenu = () => (
    <Menu
      anchorEl={mobileMenuAnchor}
      open={Boolean(mobileMenuAnchor)}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={() => handleNavigation('/dashboard')}>
        <Dashboard sx={{ mr: 2 }} />
        Dashboard
      </MenuItem>
      <MenuItem onClick={() => handleNavigation('/leaderboard')}>
        <Leaderboard sx={{ mr: 2 }} />
        Leaderboard
      </MenuItem>
    </Menu>
  );

  const ProfileMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem disabled>
        <Typography variant="body2" color="text.secondary">
          Team: {teamName}
        </Typography>
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <AppBar position="sticky" color="primary">
      <Toolbar>
        {/* Logo/Brand */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexGrow: { xs: 1, md: 0 },
            cursor: 'pointer'
          }}
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
        >
          <Code sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            CS Club Hackathon
          </Typography>
        </Box>

        {/* Contest Info */}
        {contestName && (
          <Box sx={{ mx: 2, display: { xs: 'none', md: 'block' } }}>
            <Typography variant="body2" color="inherit" sx={{ opacity: 0.9 }}>
              {contestName}
            </Typography>
          </Box>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Contest Timer */}
        {displayTime && (
          <Box sx={{ mx: 2 }}>
            <Chip
              icon={<Timer />}
              label={displayTime}
              variant="filled"
              sx={{
                backgroundColor: getTimerColor(),
                color: 'white',
                fontWeight: 'bold',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            />
          </Box>
        )}

        {isAuthenticated ? (
          <>
            {/* Desktop Navigation */}
            {!isMobile && <NavigationButtons />}

            {/* Real-time Components */}
            <ConnectionStatus compact />
            <NotificationSystem contestId={contestId} />

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={handleMobileMenuOpen}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Profile Menu */}
            <IconButton
              color="inherit"
              onClick={handleProfileMenuOpen}
              sx={{ ml: 1 }}
            >
              <AccountCircle />
            </IconButton>

            {/* Menus */}
            <MobileMenu />
            <ProfileMenu />
          </>
        ) : (
          /* Login/Register Buttons for non-authenticated users */
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              onClick={() => navigate('/login')}
              sx={{ 
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'white' }
              }}
            >
              Login
            </Button>
            <Button
              color="secondary"
              variant="contained"
              size="small"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;