/**
 * CS Club Hackathon Platform - Material-UI Theme Configuration
 * Phase 1.4: Custom theme with ICPC-style colors and responsive design
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    contest: {
      accepted: string;
      wrongAnswer: string;
      timeLimit: string;
      runtimeError: string;
      compilationError: string;
      memoryLimit: string;
      pending: string;
    };
  }

  interface PaletteOptions {
    contest?: {
      accepted?: string;
      wrongAnswer?: string;
      timeLimit?: string;
      runtimeError?: string;
      compilationError?: string;
      memoryLimit?: string;
      pending?: string;
    };
  }
}

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // ICPC Blue
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2e7d32', // ICPC Green
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32', // Green for Accepted
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02', // Orange for Time Limit Exceeded
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f', // Red for Wrong Answer
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1', // Blue for Compilation Error
      light: '#03a9f4',
      dark: '#01579b',
    },
    contest: {
      accepted: '#2e7d32',      // Green
      wrongAnswer: '#d32f2f',   // Red
      timeLimit: '#ed6c02',     // Orange
      runtimeError: '#7b1fa2',  // Purple
      compilationError: '#0288d1', // Blue
      memoryLimit: '#c2185b',   // Pink
      pending: '#757575',       // Gray
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        containedPrimary: {
          boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
          },
        },
        containedSecondary: {
          boxShadow: '0 2px 4px rgba(46, 125, 50, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(46, 125, 50, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          paddingBottom: 8,
        },
        title: {
          fontSize: '1.25rem',
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f5f5',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#424242',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorSuccess: {
          backgroundColor: '#2e7d32',
          color: '#ffffff',
        },
        colorError: {
          backgroundColor: '#d32f2f',
          color: '#ffffff',
        },
        colorWarning: {
          backgroundColor: '#ed6c02',
          color: '#ffffff',
        },
        colorInfo: {
          backgroundColor: '#0288d1',
          color: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px',
          '@media (min-width: 600px)': {
            minHeight: '64px',
          },
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);

// Contest-specific color utilities
export const getVerdictColor = (verdict: string): string => {
  switch (verdict.toLowerCase()) {
    case 'accepted':
    case 'ac':
      return theme.palette.contest.accepted;
    case 'wrong_answer':
    case 'wa':
      return theme.palette.contest.wrongAnswer;
    case 'time_limit_exceeded':
    case 'tle':
      return theme.palette.contest.timeLimit;
    case 'runtime_error':
    case 'rte':
      return theme.palette.contest.runtimeError;
    case 'compilation_error':
    case 'ce':
      return theme.palette.contest.compilationError;
    case 'memory_limit_exceeded':
    case 'mle':
      return theme.palette.contest.memoryLimit;
    case 'pending':
    default:
      return theme.palette.contest.pending;
  }
};

export const getVerdictIcon = (verdict: string): string => {
  switch (verdict.toLowerCase()) {
    case 'accepted':
    case 'ac':
      return '✓';
    case 'wrong_answer':
    case 'wa':
      return '✗';
    case 'time_limit_exceeded':
    case 'tle':
      return '⏱';
    case 'runtime_error':
    case 'rte':
      return '💥';
    case 'compilation_error':
    case 'ce':
      return '📝';
    case 'memory_limit_exceeded':
    case 'mle':
      return '🧠';
    case 'pending':
      return '⏳';
    default:
      return '?';
  }
};

export default theme;