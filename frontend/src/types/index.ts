
export interface Team {
  id: number;
  teamName: string;
  contestCode: string;
  schoolName?: string;
  memberNames?: string[];
  sessionToken: string;
  registeredAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface Contest {
  id: number;
  contestName: string;
  description: string;
  registrationCode: string;
  startTime: string;
  duration: number; 
  freezeTime: number; 
  isActive: boolean;
}

export interface Problem {
  id: number;
  contestId: number;
  problemLetter: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  constraints: string;
  timeLimit: number; // in milliseconds
  memoryLimit: number; // in MB
  difficulty: 'easy' | 'medium' | 'hard';
}

// Submission types
export interface Submission {
  id: number;
  teamId: number;
  problemId: number;
  language: 'cpp' | 'java' | 'python';
  code: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error' | 'memory_limit_exceeded';
  submissionTime: string;
  executionTime: number | null; // in milliseconds
  memoryUsed: number | null; // in KB
  judgedAt: string | null;
}

// Execution result types
export interface ExecutionResult {
  verdict: string;
  exitCode: number;
  output: string;
  error: string;
  executionTime: number;
  memoryUsed: number;
  compileTime: number;
}

// Contest results types
export interface ContestResult {
  id: number;
  contestId: number;
  teamId: number;
  teamName: string;
  problemsSolved: number;
  penaltyTime: number; // in minutes
  lastSubmissionTime: string | null;
  rank: number | null;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  problemsSolved: number;
  penaltyTime: number;
  problems: ProblemStatus[];
  lastSubmissionTime: string | null;
}

export interface ProblemStatus {
  problemLetter: string;
  solved: boolean;
  attempts: number;
  solveTime: number | null; // minutes from contest start
  firstToSolve: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  team: Team | null;
  token: string | null;
}

// Contest timer types
export interface ContestTimer {
  contestId: number;
  startTime: string;
  duration: number;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isFrozen: boolean;
  hasEnded: boolean;
}

// Language configuration
export interface LanguageConfig {
  id: string;
  name: string;
  version: string;
  timeMultiplier: number;
  memoryMultiplier: number;
  fileExtension: string;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'leaderboard_update' | 'submission_result' | 'contest_status' | 'system_notification';
  data: any;
  timestamp: string;
}

// Form types
export interface RegisterFormData {
  teamName: string;
  contestCode: string;
  password: string;
  schoolName: string;
  memberNames: string[];
}

export interface LoginFormData {
  teamName: string;
  password: string;
}

export interface SubmissionFormData {
  problemId: number;
  language: 'cpp' | 'java' | 'python';
  code: string;
}

// Route types
export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  requiresAuth: boolean;
  exact?: boolean;
}

// Theme types (extending MUI theme)
export interface CustomTheme {
  palette: {
    primary: {
      main: string;
      light: string;
      dark: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
    };
    success: {
      main: string;
    };
    warning: {
      main: string;
    };
    error: {
      main: string;
    };
    info: {
      main: string;
    };
    contest: {
      accepted: string;
      wrongAnswer: string;
      timeLimit: string;
      runtimeError: string;
      compilationError: string;
      memoryLimit: string;
      pending: string;
    };
  };
}