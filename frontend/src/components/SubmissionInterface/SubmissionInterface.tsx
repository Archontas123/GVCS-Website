/**
 * CS Club Hackathon Platform - Submission Interface Component
 * Phase 5.4: Complete submission workflow with history and verdict tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Badge,
  Collapse,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Send,
  History,
  Code,
  CheckCircle,
  Cancel,
  Schedule,
  Memory,
  Error as ErrorIcon,
  Warning,
  Refresh,
  Visibility,
  ExpandMore,
  ExpandLess,
  Timer,
  PlayArrow,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

// Supported languages
const SUPPORTED_LANGUAGES = [
  { id: 'cpp', name: 'C++', extension: '.cpp', timeMultiplier: 1.0 },
  { id: 'java', name: 'Java', extension: '.java', timeMultiplier: 2.0 },
  { id: 'python', name: 'Python', extension: '.py', timeMultiplier: 5.0 },
] as const;

// Submission status types
export type SubmissionStatus = 
  | 'pending'
  | 'judging'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error'
  | 'presentation_error';

export interface Submission {
  id: number;
  problemId: number;
  language: string;
  code: string;
  status: SubmissionStatus;
  submissionTime: string;
  judgedAt?: string;
  executionTime?: number; // in ms
  memoryUsed?: number; // in KB
  verdict?: string;
  errorMessage?: string;
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface SubmissionInterfaceProps {
  problemId: number;
  code: string;
  language: string;
  onLanguageChange: (language: string) => void;
  onSubmit: (code: string, language: string) => Promise<void>;
  contestStatus?: {
    isRunning: boolean;
    timeRemaining: number;
    canSubmit: boolean;
  };
  maxFileSize?: number; // in bytes
}

// Mock submission data for demo
const mockSubmissions: Submission[] = [
  {
    id: 1,
    problemId: 1,
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}',
    status: 'accepted',
    submissionTime: '2025-08-12T02:30:00Z',
    judgedAt: '2025-08-12T02:30:05Z',
    executionTime: 15,
    memoryUsed: 1024,
    verdict: 'Accepted',
    testCasesPassed: 10,
    totalTestCases: 10,
  },
  {
    id: 2,
    problemId: 1,
    language: 'python',
    code: 'a, b = map(int, input().split())\nprint(a + b)',
    status: 'wrong_answer',
    submissionTime: '2025-08-12T02:25:00Z',
    judgedAt: '2025-08-12T02:25:03Z',
    executionTime: 45,
    memoryUsed: 2048,
    verdict: 'Wrong Answer',
    testCasesPassed: 8,
    totalTestCases: 10,
  },
  {
    id: 3,
    problemId: 1,
    language: 'java',
    code: 'import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}',
    status: 'time_limit_exceeded',
    submissionTime: '2025-08-12T02:20:00Z',
    judgedAt: '2025-08-12T02:20:10Z',
    executionTime: 2000,
    memoryUsed: 4096,
    verdict: 'Time Limit Exceeded',
    testCasesPassed: 5,
    totalTestCases: 10,
  }
];

const SubmissionInterface: React.FC<SubmissionInterfaceProps> = ({
  problemId,
  code,
  language,
  onLanguageChange,
  onSubmit,
  contestStatus = { isRunning: true, timeRemaining: 3600, canSubmit: true },
  maxFileSize = 64 * 1024, // 64KB default
}) => {
  const theme = useTheme();
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<Date | null>(null);
  const [submissionCooldown, setSubmissionCooldown] = useState(0);

  // Remember last selected language
  useEffect(() => {
    const savedLanguage = localStorage.getItem('lastSelectedLanguage');
    if (savedLanguage && SUPPORTED_LANGUAGES.find(l => l.id === savedLanguage)) {
      onLanguageChange(savedLanguage);
    }
  }, [onLanguageChange]);

  // Save language selection
  useEffect(() => {
    localStorage.setItem('lastSelectedLanguage', language);
  }, [language]);

  // Handle submission cooldown
  useEffect(() => {
    if (submissionCooldown > 0) {
      const timer = setTimeout(() => {
        setSubmissionCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [submissionCooldown]);

  // Validate submission
  const validateSubmission = useCallback((): string[] => {
    const errors: string[] = [];

    // Check if code is not empty
    if (!code.trim()) {
      errors.push('Code cannot be empty');
    }

    // Check file size
    const codeSize = new Blob([code]).size;
    if (codeSize > maxFileSize) {
      errors.push(`Code size (${Math.round(codeSize / 1024)}KB) exceeds limit (${Math.round(maxFileSize / 1024)}KB)`);
    }

    // Check if language is selected
    if (!language) {
      errors.push('Please select a programming language');
    }

    // Check contest status
    if (!contestStatus.canSubmit) {
      errors.push('Submissions are not allowed at this time');
    }

    if (!contestStatus.isRunning) {
      errors.push('Contest is not currently running');
    }

    // Check submission cooldown
    if (submissionCooldown > 0) {
      errors.push(`Please wait ${submissionCooldown} seconds before submitting again`);
    }

    return errors;
  }, [code, language, contestStatus, maxFileSize, submissionCooldown]);

  // Handle submission
  const handleSubmit = useCallback(async () => {
    const errors = validateSubmission();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(code, language);
      
      // Add new submission to history (mock)
      const newSubmission: Submission = {
        id: Date.now(),
        problemId,
        language,
        code,
        status: 'pending',
        submissionTime: new Date().toISOString(),
      };
      
      setSubmissions(prev => [newSubmission, ...prev]);
      setLastSubmissionTime(new Date());
      setSubmissionCooldown(10); // 10 second cooldown
      setConfirmDialogOpen(false);
      
      // Simulate judging process
      setTimeout(() => {
        setSubmissions(prev => prev.map(sub => 
          sub.id === newSubmission.id 
            ? { ...sub, status: 'judging' }
            : sub
        ));
        
        setTimeout(() => {
          setSubmissions(prev => prev.map(sub => 
            sub.id === newSubmission.id 
              ? { 
                  ...sub, 
                  status: 'accepted',
                  judgedAt: new Date().toISOString(),
                  executionTime: 25,
                  memoryUsed: 1024,
                  verdict: 'Accepted',
                  testCasesPassed: 10,
                  totalTestCases: 10,
                }
              : sub
          ));
        }, 3000);
      }, 1000);
      
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateSubmission, onSubmit, code, language, problemId]);

  // Get verdict display info
  const getVerdictInfo = (status: SubmissionStatus) => {
    switch (status) {
      case 'pending':
        return { icon: <Schedule />, color: theme.palette.grey[500], text: 'Pending' };
      case 'judging':
        return { icon: <PlayArrow />, color: theme.palette.info.main, text: 'Judging' };
      case 'accepted':
        return { icon: <CheckCircle />, color: theme.palette.success.main, text: 'Accepted' };
      case 'wrong_answer':
        return { icon: <Cancel />, color: theme.palette.error.main, text: 'Wrong Answer' };
      case 'time_limit_exceeded':
        return { icon: <Schedule />, color: theme.palette.warning.main, text: 'Time Limit Exceeded' };
      case 'memory_limit_exceeded':
        return { icon: <Memory />, color: theme.palette.warning.main, text: 'Memory Limit Exceeded' };
      case 'runtime_error':
        return { icon: <ErrorIcon />, color: theme.palette.secondary.main, text: 'Runtime Error' };
      case 'compilation_error':
        return { icon: <Code />, color: theme.palette.info.main, text: 'Compilation Error' };
      case 'presentation_error':
        return { icon: <Warning />, color: theme.palette.warning.main, text: 'Presentation Error' };
      default:
        return { icon: <Schedule />, color: theme.palette.grey[500], text: 'Unknown' };
    }
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.id === language);
  const recentSubmissions = submissions.filter(s => s.problemId === problemId).slice(0, 5);
  const lastAccepted = submissions.find(s => s.problemId === problemId && s.status === 'accepted');

  return (
    <Box>
      {/* Language Selection */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code /> Submit Solution
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={language}
              label="Language"
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang.id} value={lang.id}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {currentLanguage && (
            <Chip
              label={`Time multiplier: ${currentLanguage.timeMultiplier}x`}
              size="small"
              variant="outlined"
              icon={<Timer />}
            />
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<History />}
            onClick={() => setHistoryOpen(!historyOpen)}
            color={recentSubmissions.length > 0 ? 'primary' : 'inherit'}
          >
            History ({recentSubmissions.length})
          </Button>
        </Box>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Please fix the following issues:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Contest Status */}
        {!contestStatus.isRunning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Contest is not currently running. Submissions are disabled.
          </Alert>
        )}

        {contestStatus.timeRemaining < 300 && contestStatus.isRunning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Less than 5 minutes remaining in the contest!
          </Alert>
        )}

        {/* Last Accepted Solution */}
        {lastAccepted && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ✅ You have an accepted solution in {lastAccepted.language.toUpperCase()} 
              ({formatDistanceToNow(new Date(lastAccepted.submissionTime))} ago)
            </Typography>
          </Alert>
        )}

        {/* Submission Button */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={isSubmitting ? <LinearProgress size={20} /> : <Send />}
            onClick={() => setConfirmDialogOpen(true)}
            disabled={isSubmitting || !contestStatus.canSubmit || submissionCooldown > 0}
            sx={{ 
              minWidth: 150,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Submitting...' : 
             submissionCooldown > 0 ? `Wait ${submissionCooldown}s` : 
             'Submit Solution'}
          </Button>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Code size: {Math.round(new Blob([code]).size / 1024 * 100) / 100} KB
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max: {Math.round(maxFileSize / 1024)} KB
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Submission History */}
      <Collapse in={historyOpen}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History /> Submission History
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => {}}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Typography>

            {recentSubmissions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No submissions yet for this problem
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Verdict</TableCell>
                      <TableCell>Runtime</TableCell>
                      <TableCell>Memory</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSubmissions.map((submission) => {
                      const verdictInfo = getVerdictInfo(submission.status);
                      return (
                        <TableRow key={submission.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDistanceToNow(new Date(submission.submissionTime))} ago
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(submission.submissionTime).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={submission.language.toUpperCase()} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ color: verdictInfo.color }}>
                                {verdictInfo.icon}
                              </Box>
                              <Typography 
                                variant="body2" 
                                sx={{ color: verdictInfo.color, fontWeight: 500 }}
                              >
                                {verdictInfo.text}
                              </Typography>
                              {submission.status === 'judging' && (
                                <LinearProgress size={16} sx={{ width: 20 }} />
                              )}
                            </Box>
                            {submission.testCasesPassed !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                {submission.testCasesPassed}/{submission.totalTestCases} tests
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.executionTime ? `${submission.executionTime}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            {submission.memoryUsed ? `${Math.round(submission.memoryUsed / 1024)}KB` : '-'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Code">
                              <IconButton 
                                size="small" 
                                onClick={() => setSelectedSubmission(submission)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Collapse>

      {/* Submission Confirmation Dialog */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to submit your solution?
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Language:</strong> {currentLanguage?.name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Code size:</strong> {Math.round(new Blob([code]).size / 1024 * 100) / 100} KB
            </Typography>
            <Typography variant="body2">
              <strong>Time multiplier:</strong> {currentLanguage?.timeMultiplier}x
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Once submitted, you cannot modify your solution. Make sure your code is ready!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={isSubmitting ? <LinearProgress size={16} /> : <Send />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submission Details Dialog */}
      <Dialog 
        open={!!selectedSubmission} 
        onClose={() => setSelectedSubmission(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Submission Details - {selectedSubmission && getVerdictInfo(selectedSubmission.status).text}
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Language</Typography>
                  <Typography variant="body1">{selectedSubmission.language.toUpperCase()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Submission Time</Typography>
                  <Typography variant="body1">
                    {new Date(selectedSubmission.submissionTime).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Execution Time</Typography>
                  <Typography variant="body1">
                    {selectedSubmission.executionTime ? `${selectedSubmission.executionTime}ms` : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Memory Used</Typography>
                  <Typography variant="body1">
                    {selectedSubmission.memoryUsed ? `${Math.round(selectedSubmission.memoryUsed / 1024)}KB` : 'N/A'}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" gutterBottom>Submitted Code:</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  {selectedSubmission.code}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSubmission(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubmissionInterface;