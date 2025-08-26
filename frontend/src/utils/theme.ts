export const theme = {
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    contest: {
      accepted: '#2e7d32',
      wrongAnswer: '#d32f2f',
      timeLimit: '#ed6c02',
      runtimeError: '#7b1fa2',
      compilationError: '#0288d1',
      memoryLimit: '#c2185b',
      pending: '#757575',
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
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

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
      return 'RTE';
    case 'compilation_error':
    case 'ce':
      return 'CE';
    case 'memory_limit_exceeded':
    case 'mle':
      return 'MLE';
    case 'pending':
      return 'PENDING';
    default:
      return '?';
  }
};

export const getVerdictChipClass = (verdict: string): string => {
  switch (verdict.toLowerCase()) {
    case 'accepted':
    case 'ac':
      return 'chip chip-success';
    case 'wrong_answer':
    case 'wa':
      return 'chip chip-error';
    case 'time_limit_exceeded':
    case 'tle':
      return 'chip chip-warning';
    case 'runtime_error':
    case 'rte':
    case 'compilation_error':
    case 'ce':
    case 'memory_limit_exceeded':
    case 'mle':
      return 'chip chip-info';
    case 'pending':
    default:
      return 'chip chip-pending';
  }
};

export default theme;