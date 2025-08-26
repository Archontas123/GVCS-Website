/**
 * CS Club Hackathon Platform - Submission Interface Component (Modern Admin Style)
 * Updated to match new design system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import '../../styles/theme.css';

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
        return { icon: 'PENDING', color: '#6b7280', bgColor: '#f3f4f6', text: 'Pending' };
      case 'judging':
        return { icon: 'JUDGING', color: '#1d4ed8', bgColor: '#dbeafe', text: 'Judging' };
      case 'accepted':
        return { icon: 'AC', color: '#16a34a', bgColor: '#dcfce7', text: 'Accepted' };
      case 'wrong_answer':
        return { icon: 'WA', color: '#dc2626', bgColor: '#fef2f2', text: 'Wrong Answer' };
      case 'time_limit_exceeded':
        return { icon: 'TLE', color: '#d97706', bgColor: '#fef3c7', text: 'Time Limit Exceeded' };
      case 'memory_limit_exceeded':
        return { icon: 'MLE', color: '#d97706', bgColor: '#fef3c7', text: 'Memory Limit Exceeded' };
      case 'runtime_error':
        return { icon: 'RTE', color: '#7c2d12', bgColor: '#fed7aa', text: 'Runtime Error' };
      case 'compilation_error':
        return { icon: 'CE', color: '#1d4ed8', bgColor: '#dbeafe', text: 'Compilation Error' };
      case 'presentation_error':
        return { icon: '📝', color: '#d97706', bgColor: '#fef3c7', text: 'Presentation Error' };
      default:
        return { icon: '❓', color: '#6b7280', bgColor: '#f3f4f6', text: 'Unknown' };
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
            Warning: Less than 5 minutes remaining in the contest!
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

      {/* Submission Confirmation Modal */}
      {confirmDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Confirm Submission
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '1rem',
                color: '#374151',
                marginBottom: '16px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Are you sure you want to submit your solution?
              </p>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  <strong>Language:</strong> {currentLanguage?.name}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  <strong>Code size:</strong> {Math.round(new Blob([code]).size / 1024 * 100) / 100} KB
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#374151',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  <strong>Time multiplier:</strong> {currentLanguage?.timeMultiplier}x
                </div>
              </div>
              <div style={{
                backgroundColor: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '12px',
                padding: '16px',
                color: '#1e40af',
                fontSize: '0.9rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Once submitted, you cannot modify your solution. Make sure your code is ready!
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={() => setConfirmDialogOpen(false)}
                style={{
                  background: '#ffffff',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  background: isSubmitting
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting && (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid transparent',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Submission Details - {getVerdictInfo(selectedSubmission.status).text}
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Language</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#1f2937',
                    fontWeight: 600,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>{selectedSubmission.language.toUpperCase()}</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Submission Time</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#1f2937',
                    fontWeight: 600,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    {new Date(selectedSubmission.submissionTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Execution Time</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#1f2937',
                    fontWeight: 600,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    {selectedSubmission.executionTime ? `${selectedSubmission.executionTime}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Memory Used</div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#1f2937',
                    fontWeight: 600,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    {selectedSubmission.memoryUsed ? `${Math.round(selectedSubmission.memoryUsed / 1024)}KB` : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>Submitted Code:</div>
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                padding: '16px',
              }}>
                <pre style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '400px',
                  overflow: 'auto',
                  color: '#1f2937',
                  lineHeight: '1.5',
                }}>
                  {selectedSubmission.code}
                </pre>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default SubmissionInterface;