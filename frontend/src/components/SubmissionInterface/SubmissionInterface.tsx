import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import '../../styles/theme.css';

const SUPPORTED_LANGUAGES = [
  { id: 'cpp', name: 'C++', extension: '.cpp', timeMultiplier: 1.0 },
  { id: 'java', name: 'Java', extension: '.java', timeMultiplier: 2.0 },
  { id: 'python', name: 'Python', extension: '.py', timeMultiplier: 5.0 },
] as const;

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
  executionTime?: number; 
  memoryUsed?: number; 
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
  maxFileSize?: number; 
}


const SubmissionInterface: React.FC<SubmissionInterfaceProps> = ({
  problemId,
  code,
  language,
  onLanguageChange,
  onSubmit,
  contestStatus = { isRunning: true, timeRemaining: 3600, canSubmit: true },
  maxFileSize = 64 * 1024, // 64KB default
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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
      setLastSubmissionTime(new Date());
      setSubmissionCooldown(10); // 10 second cooldown
      setConfirmDialogOpen(false);
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
        return { icon: 'PE', color: '#d97706', bgColor: '#fef3c7', text: 'Presentation Error' };
      default:
        return { icon: 'UNK', color: '#6b7280', bgColor: '#f3f4f6', text: 'Unknown' };
    }
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.id === language);
  const recentSubmissions = submissions.filter(s => s.problemId === problemId).slice(0, 5);
  const lastAccepted = submissions.find(s => s.problemId === problemId && s.status === 'accepted');

  return (
    <div className="submission-interface">
      {/* Language Selection */}
      <div className="submission-panel">
        <h3 className="panel-title">
          Submit Solution
        </h3>
        
        <div className="submission-controls">
          <div className="form-group">
            <label htmlFor="language-select">Language</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="language-select"
            >
              <option value="">Select Language</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {currentLanguage && (
            <span className="time-multiplier-chip">
              Time multiplier: {currentLanguage.timeMultiplier}x
            </span>
          )}

          <div className="spacer" />

          <button
            className={`history-button ${recentSubmissions.length > 0 ? 'has-submissions' : ''}`}
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            History ({recentSubmissions.length})
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="alert alert-error">
            <div className="alert-title">
              Please fix the following issues:
            </div>
            <ul className="error-list">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Contest Status */}
        {!contestStatus.isRunning && (
          <div className="alert alert-warning">
            Contest is not currently running. Submissions are disabled.
          </div>
        )}

        {contestStatus.timeRemaining < 300 && contestStatus.isRunning && (
          <div className="alert alert-warning">
            Warning: Less than 5 minutes remaining in the contest!
          </div>
        )}

        {/* Last Accepted Solution */}
        {lastAccepted && (
          <div className="alert alert-success">
            <div>
              You have an accepted solution in {lastAccepted.language.toUpperCase()} 
              ({formatDistanceToNow(new Date(lastAccepted.submissionTime))} ago)
            </div>
          </div>
        )}

        {/* Submission Button */}
        <div className="submission-button-section">
          <button
            className={`submit-button ${isSubmitting || !contestStatus.canSubmit || submissionCooldown > 0 ? 'disabled' : ''}`}
            onClick={() => setConfirmDialogOpen(true)}
            disabled={isSubmitting || !contestStatus.canSubmit || submissionCooldown > 0}
          >
            {isSubmitting && <span className="loading-spinner"></span>}
            {isSubmitting ? 'Submitting...' : 
             submissionCooldown > 0 ? `Wait ${submissionCooldown}s` : 
             'Submit Solution'}
          </button>

          <div className="code-size-info">
            <div className="code-size">
              Code size: {Math.round(new Blob([code]).size / 1024 * 100) / 100} KB
            </div>
            <div className="max-size">
              Max: {Math.round(maxFileSize / 1024)} KB
            </div>
          </div>
        </div>
      </div>

      {/* Submission History */}
      <div className={`history-section ${historyOpen ? 'open' : 'collapsed'}`}>
        <div className="history-card">
          <div className="history-header">
            <h4 className="history-title">
              Submission History
            </h4>
            <button className="refresh-button" onClick={() => {}} title="Refresh">
              Refresh
            </button>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="no-submissions">
              No submissions yet for this problem
            </div>
          ) : (
            <div className="submissions-table-container">
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Language</th>
                    <th>Verdict</th>
                    <th>Runtime</th>
                    <th>Memory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((submission) => {
                    const verdictInfo = getVerdictInfo(submission.status);
                    return (
                      <tr key={submission.id} className="submission-row">
                        <td>
                          <div className="time-cell">
                            <div className="relative-time">
                              {formatDistanceToNow(new Date(submission.submissionTime))} ago
                            </div>
                            <div className="absolute-time">
                              {new Date(submission.submissionTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="language-chip">
                            {submission.language.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="verdict-cell">
                            <div className="verdict-info">
                              <span 
                                className="verdict-icon" 
                                style={{ color: verdictInfo.color }}
                              >
                                {verdictInfo.icon}
                              </span>
                              <span 
                                className="verdict-text" 
                                style={{ color: verdictInfo.color }}
                              >
                                {verdictInfo.text}
                              </span>
                              {submission.status === 'judging' && (
                                <span className="judging-spinner"></span>
                              )}
                            </div>
                            {submission.testCasesPassed !== undefined && (
                              <div className="test-cases">
                                {submission.testCasesPassed}/{submission.totalTestCases} tests
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {submission.executionTime ? `${submission.executionTime}ms` : '-'}
                        </td>
                        <td>
                          {submission.memoryUsed ? `${Math.round(submission.memoryUsed / 1024)}KB` : '-'}
                        </td>
                        <td>
                          <button 
                            className="view-code-button"
                            onClick={() => setSelectedSubmission(submission)}
                            title="View Code"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default SubmissionInterface;