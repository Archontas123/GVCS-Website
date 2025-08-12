/**
 * CS Club Hackathon Platform - Main Layout Component
 * Phase 1.4: Responsive layout with header and main content area
 */

import React, { ReactNode } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  teamName?: string;
  contestName?: string;
  timeRemaining?: number;
  isAuthenticated: boolean;
  onLogout: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  contestId?: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  teamName,
  contestName,
  timeRemaining,
  isAuthenticated,
  onLogout,
  maxWidth = 'lg',
  disableGutters = false,
  contestId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Header */}
      <Header
        teamName={teamName}
        contestName={contestName}
        timeRemaining={timeRemaining}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        contestId={contestId}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Container
          maxWidth={maxWidth}
          disableGutters={disableGutters || isMobile}
          sx={{
            px: { xs: 1, sm: 2 },
            height: '100%',
          }}
        >
          {children}
        </Container>
      </Box>

      {/* Footer (optional) */}
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          bgcolor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'text.secondary',
        }}
      >
        CS Club Hackathon Platform - Powered by React & Material-UI
      </Box>
    </Box>
  );
};

export default Layout;