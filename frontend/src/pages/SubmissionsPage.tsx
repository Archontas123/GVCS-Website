import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './SubmissionsPage.css';

interface TestCase {
  testCase?: string;
  passed?: boolean;
  verdict?: string;
  outputMatches?: boolean;
  error?: string;
  output?: string;
  expectedOutput?: string;
  expected_output?: string;
  executionTime?: number;
  memoryUsed?: number;
  isSample?: boolean;
}

interface Submission {
  id: number;
  problem_id: number;
  problem_title?: string;
  problem_letter?: string;
  status: string;
  verdict?: string;
  execution_time?: number;
  memory_used?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
  points_earned?: number;
  submitted_at: string;
  language: string;
  judge_output?: {
    testCases?: TestCase[];
  };
}

const SubmissionsPage: React.FC = () => {
  const { team, token } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (team?.id && token) {
      fetchSubmissions();
    }
  }, [team?.id, token]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await api.getTeamSubmissions(team!.id, token!);

      if (response.success) {
        setSubmissions(response.data);
      } else {
        setError(response.error || 'Failed to load submissions');
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      accepted: '#10b981',
      wrong_answer: '#ea580c',
      runtime_error: '#ef4444',
      time_limit_exceeded: '#f59e0b',
      memory_limit_exceeded: '#8b5cf6',
      compilation_error: '#3b82f6',
      pending: '#6b7280',
      judging: '#6b7280',
    };
    return statusMap[status] || '#6b7280';
  };

  const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      accepted: 'AC',
      wrong_answer: 'WA',
      runtime_error: 'RTE',
      time_limit_exceeded: 'TLE',
      memory_limit_exceeded: 'MLE',
      compilation_error: 'CE',
      pending: 'Pending',
      judging: 'Judging',
    };
    return labelMap[status] || status.toUpperCase();
  };

  const formatTime = (ms?: number): string => {
    if (ms === undefined || ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb?: number): string => {
    if (mb === undefined || mb === null) return 'N/A';
    return `${mb.toFixed(2)}MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleString();
  };

  const openSubmissionDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowDetails(true);
  };

  const closeSubmissionDetails = () => {
    setShowDetails(false);
    setSelectedSubmission(null);
  };

  if (loading) {
    return (
      <div className="submissions-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="submissions-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchSubmissions} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="submissions-page">
      <div className="submissions-header">
        <h1>My Submissions</h1>
        <button onClick={fetchSubmissions} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-state">
          <p>No submissions yet. Start solving problems!</p>
        </div>
      ) : (
        <div className="submissions-table-container">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Problem</th>
                <th>Status</th>
                <th>Tests</th>
                <th>Time</th>
                <th>Memory</th>
                <th>Points</th>
                <th>Language</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission, index) => (
                <tr key={submission.id}>
                  <td>{submissions.length - index}</td>
                  <td>
                    {submission.problem_letter && (
                      <strong>{submission.problem_letter}. </strong>
                    )}
                    {submission.problem_title || `Problem ${submission.problem_id}`}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(submission.status),
                      }}
                    >
                      {getStatusLabel(submission.status)}
                    </span>
                  </td>
                  <td>
                    {submission.test_cases_passed !== undefined &&
                    submission.total_test_cases !== undefined
                      ? `${submission.test_cases_passed}/${submission.total_test_cases}`
                      : 'N/A'}
                  </td>
                  <td>{formatTime(submission.execution_time)}</td>
                  <td>{formatMemory(submission.memory_used)}</td>
                  <td>{submission.points_earned?.toFixed(1) || '0.0'}</td>
                  <td>
                    <span className="language-badge">{submission.language}</span>
                  </td>
                  <td>{formatDate(submission.submitted_at)}</td>
                  <td>
                    <button
                      onClick={() => openSubmissionDetails(submission)}
                      className="view-details-button"
                      disabled={!submission.judge_output?.testCases}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submission Details Modal */}
      {showDetails && selectedSubmission && (
        <div className="modal-overlay" onClick={closeSubmissionDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Submission #{selectedSubmission.id} -{' '}
                {selectedSubmission.problem_letter && `${selectedSubmission.problem_letter}. `}
                {selectedSubmission.problem_title || `Problem ${selectedSubmission.problem_id}`}
              </h2>
              <button className="close-button" onClick={closeSubmissionDetails}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Overall Stats */}
              <div className="submission-stats">
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(selectedSubmission.status),
                    }}
                  >
                    {getStatusLabel(selectedSubmission.status)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tests Passed:</span>
                  <span>
                    {selectedSubmission.test_cases_passed}/{selectedSubmission.total_test_cases}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Execution Time:</span>
                  <span>{formatTime(selectedSubmission.execution_time)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Memory Used:</span>
                  <span>{formatMemory(selectedSubmission.memory_used)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Points:</span>
                  <span>{selectedSubmission.points_earned?.toFixed(1) || '0.0'}</span>
                </div>
              </div>

              {/* Test Case Breakdown */}
              {selectedSubmission.judge_output?.testCases && (
                <div className="test-cases-section">
                  <h3>Test Case Breakdown</h3>
                  <div className="test-cases-list">
                    {selectedSubmission.judge_output.testCases.map((testCase, index) => {
                      const isPassed =
                        testCase.passed ||
                        testCase.verdict === 'Accepted' ||
                        testCase.outputMatches;
                      const isSample = testCase.isSample;
                      const hasError = !!testCase.error;

                      const bgColor = isPassed
                        ? '#d1fae5'
                        : hasError
                        ? '#fee2e2'
                        : '#fed7aa';
                      const borderColor = isPassed
                        ? '#10b981'
                        : hasError
                        ? '#ef4444'
                        : '#ea580c';
                      const textColor = isPassed
                        ? '#065f46'
                        : hasError
                        ? '#7f1d1d'
                        : '#7c2d12';

                      return (
                        <div
                          key={index}
                          className="test-case-item"
                          style={{
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                          }}
                        >
                          <div className="test-case-header">
                            <div className="test-case-title" style={{ color: textColor }}>
                              {isSample ? '📝 ' : '🔒 '}
                              {testCase.testCase || `Test Case #${index + 1}`}
                              {isSample && ' (Sample)'}
                            </div>
                            <div
                              className="test-case-status"
                              style={{ color: textColor }}
                            >
                              {isPassed ? '✓ PASSED' : '✗ FAILED'}
                            </div>
                          </div>

                          {/* Error message */}
                          {hasError && (
                            <div className="test-case-error" style={{ color: textColor }}>
                              <strong>Error:</strong> {testCase.error}
                            </div>
                          )}

                          {/* Input/Output for sample tests or errors */}
                          {!isPassed && (isSample || hasError) && !hasError && (
                            <div className="test-case-io" style={{ color: textColor }}>
                              <div>
                                <strong>Expected:</strong>{' '}
                                {testCase.expectedOutput || testCase.expected_output || 'N/A'}
                              </div>
                              <div>
                                <strong>Got:</strong> {testCase.output || 'N/A'}
                              </div>
                            </div>
                          )}

                          {/* Hidden test case message */}
                          {!isPassed && !isSample && !hasError && (
                            <div className="test-case-hidden" style={{ color: textColor }}>
                              Hidden test case - {testCase.verdict || 'Wrong Answer'}
                            </div>
                          )}

                          {/* Execution metrics */}
                          {(testCase.executionTime !== undefined ||
                            testCase.memoryUsed !== undefined) && (
                            <div className="test-case-metrics" style={{ color: textColor }}>
                              {testCase.executionTime !== undefined &&
                                `⏱️ ${testCase.executionTime}ms`}
                              {testCase.executionTime !== undefined &&
                                testCase.memoryUsed !== undefined &&
                                ' | '}
                              {testCase.memoryUsed !== undefined &&
                                `💾 ${testCase.memoryUsed}MB`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="close-modal-button" onClick={closeSubmissionDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsPage;
