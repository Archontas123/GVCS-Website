/**
 * Team Detail Page - Admin view for team submissions
 * Shows all submissions from a team with code and results
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';

interface TeamData {
  id: number;
  team_name: string;
  school_name: string;
  contest_name: string;
  contest_id: number;
  registration_time: string;
  members: Array<{ firstName: string; lastName: string }>;
  members_count: number;
}

interface Statistics {
  total_submissions: number;
  accepted_submissions: number;
  unique_problems_attempted: number;
  unique_problems_solved: number;
  total_points: number;
  acceptance_rate: number;
}

interface Submission {
  id: number;
  problem_id: number;
  problem_title: string;
  problem_letter: string;
  problem_difficulty: string;
  problem_max_points: number;
  language: string;
  source_code: string;
  status: string;
  submitted_at: string;
  judged_at?: string;
  execution_time_ms?: number;
  memory_used_kb?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
  points_earned?: number;
  error_message?: string;
  judge_output?: any;
}

const TeamDetailPage: React.FC = () => {
  const { contestId, teamId } = useParams<{ contestId: string; teamId: string }>();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (contestId && teamId) {
      fetchTeamData();
    }
  }, [contestId, teamId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getAdminTeamSubmissions(parseInt(contestId!), parseInt(teamId!));
      if (result.success && result.data) {
        setTeam(result.data.team);
        setStatistics(result.data.statistics);
        setSubmissions(result.data.submissions);
      } else {
        throw new Error('Failed to fetch team data');
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'accepted' || statusLower === 'ac') return '#28a745';
    if (statusLower === 'pending' || statusLower === 'pe') return '#ffc107';
    if (statusLower === 'running' || statusLower === 'ru') return '#17a2b8';
    return '#dc3545';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'hard': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#CECDE2',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid transparent',
              borderTop: '4px solid #212529',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </>
    );
  }

  if (error || !team) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div
          style={{
            fontFamily: "'Press Start 2P', cursive",
            backgroundColor: '#CECDE2',
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            minHeight: '100vh',
            padding: '32px 16px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                color: '#dc2626',
                fontSize: '0.7rem',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              Error: {error || 'Team not found'}
            </div>
            <button
              onClick={() => navigate(`/admin/contests/${contestId}`)}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1rem',
                padding: '16px 24px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Back to Contest
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div
        style={{
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: '#CECDE2',
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          minHeight: '100vh',
          padding: '32px 16px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <button
              onClick={() => navigate(`/admin/contests/${contestId}`)}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#ffffff',
                color: '#212529',
                boxShadow: '4px 4px 0px #212529',
                fontSize: '0.65rem',
                padding: '10px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                marginBottom: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              ← Back to Contest
            </button>

            <h1 style={{
              fontSize: 'clamp(1.2rem, 3vw, 2rem)',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '0.05em',
              textShadow: '4px 4px 0px #212529',
            }}>
              {team.team_name}
            </h1>
            <h2 style={{
              fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)',
              color: '#FFD700',
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0px #212529',
            }}>
              {team.school_name} • {team.contest_name}
            </h2>
          </div>

          {/* Team Info & Statistics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Team Info */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '4px solid #212529',
                boxShadow: '6px 6px 0px #212529',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '0.8rem', marginBottom: '16px', color: '#212529' }}>Team Members</h3>
              <div style={{ fontSize: '0.65rem', lineHeight: '1.8', color: '#6b7280' }}>
                {team.members.map((member, idx) => (
                  <div key={idx}>
                    {idx + 1}. {member.firstName} {member.lastName}
                  </div>
                ))}
                {team.members.length === 0 && <div>No members listed</div>}
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #e5e7eb', fontSize: '0.6rem', color: '#9ca3af' }}>
                Registered: {formatDate(team.registration_time)}
              </div>
            </div>

            {/* Statistics */}
            {statistics && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '4px solid #212529',
                  boxShadow: '6px 6px 0px #212529',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '0.8rem', marginBottom: '16px', color: '#212529' }}>Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.6rem' }}>
                  <div>
                    <div style={{ color: '#6b7280' }}>Total Submissions</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#212529', marginTop: '4px' }}>
                      {statistics.total_submissions}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Accepted</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#28a745', marginTop: '4px' }}>
                      {statistics.accepted_submissions}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Problems Attempted</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#212529', marginTop: '4px' }}>
                      {statistics.unique_problems_attempted}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Problems Solved</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2D58A6', marginTop: '4px' }}>
                      {statistics.unique_problems_solved}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Total Points</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#212529', marginTop: '4px' }}>
                      {statistics.total_points}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Acceptance Rate</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#212529', marginTop: '4px' }}>
                      {statistics.acceptance_rate}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submissions List */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '8px 8px 0px #212529',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '0.9rem', marginBottom: '24px', color: '#212529', borderBottom: '3px solid #212529', paddingBottom: '12px' }}>
              All Submissions ({submissions.length})
            </h3>

            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', border: '3px dashed #212529' }}>
                <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  No submissions yet
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{
                      padding: '16px',
                      border: '4px solid #212529',
                      background: selectedSubmission?.id === submission.id ? '#f0f9ff' : '#ffffff',
                      boxShadow: '4px 4px 0px #212529',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedSubmission(selectedSubmission?.id === submission.id ? null : submission)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#212529', marginBottom: '4px' }}>
                          Problem {submission.problem_letter}: {submission.problem_title}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>
                          Submitted: {formatDate(submission.submitted_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span
                          style={{
                            backgroundColor: getDifficultyColor(submission.problem_difficulty) + '40',
                            color: getDifficultyColor(submission.problem_difficulty),
                            fontSize: '0.55rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            padding: '4px 8px',
                            border: '2px solid ' + getDifficultyColor(submission.problem_difficulty),
                          }}
                        >
                          {submission.problem_difficulty}
                        </span>
                        <span
                          style={{
                            backgroundColor: getStatusColor(submission.status) + '40',
                            color: getStatusColor(submission.status),
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            padding: '4px 8px',
                            border: '2px solid ' + getStatusColor(submission.status),
                          }}
                        >
                          {submission.status}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.6rem', color: '#6b7280', lineHeight: '1.6' }}>
                      <div>Language: <span style={{ color: '#212529', fontWeight: 'bold' }}>{submission.language}</span></div>
                      {submission.test_cases_passed !== undefined && submission.total_test_cases !== undefined && (
                        <div>Test Cases: <span style={{ color: '#212529', fontWeight: 'bold' }}>{submission.test_cases_passed}/{submission.total_test_cases}</span></div>
                      )}
                      {submission.points_earned !== undefined && (
                        <div>Points: <span style={{ color: '#212529', fontWeight: 'bold' }}>{submission.points_earned}/{submission.problem_max_points}</span></div>
                      )}
                      {submission.execution_time_ms && (
                        <div>Execution Time: <span style={{ color: '#212529', fontWeight: 'bold' }}>{submission.execution_time_ms}ms</span></div>
                      )}
                    </div>

                    {/* Expanded view with source code */}
                    {selectedSubmission?.id === submission.id && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '3px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '0.7rem', marginBottom: '8px', color: '#212529' }}>Source Code:</h4>
                        <pre
                          style={{
                            backgroundColor: '#1e1e1e',
                            color: '#d4d4d4',
                            padding: '16px',
                            border: '3px solid #212529',
                            fontSize: '0.65rem',
                            lineHeight: '1.5',
                            overflow: 'auto',
                            maxHeight: '400px',
                            fontFamily: "'Courier New', monospace",
                          }}
                        >
                          {submission.source_code}
                        </pre>

                        {submission.error_message && (
                          <>
                            <h4 style={{ fontSize: '0.7rem', marginTop: '12px', marginBottom: '8px', color: '#dc2626' }}>Error Message:</h4>
                            <div
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                padding: '12px',
                                border: '3px solid #dc2626',
                                fontSize: '0.6rem',
                                lineHeight: '1.5',
                              }}
                            >
                              {submission.error_message}
                            </div>
                          </>
                        )}

                        {/* Test Case Results */}
                        {submission.judge_output && (() => {
                          try {
                            const judgeOutput = typeof submission.judge_output === 'string'
                              ? JSON.parse(submission.judge_output)
                              : submission.judge_output;

                            if (judgeOutput.testCases && Array.isArray(judgeOutput.testCases)) {
                              return (
                                <>
                                  <h4 style={{ fontSize: '0.7rem', marginTop: '16px', marginBottom: '12px', color: '#212529' }}>
                                    Test Case Results ({judgeOutput.testCasesPassed}/{judgeOutput.testCasesRun} passed)
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {judgeOutput.testCases.map((testCase: any, idx: number) => {
                                      const isAccepted = testCase.verdict === 'Accepted' || testCase.verdict === 'AC';
                                      const verdictColor = isAccepted ? '#28a745' : '#dc3545';

                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            padding: '12px',
                                            border: '3px solid #212529',
                                            backgroundColor: isAccepted ? '#f0fdf4' : '#fef2f2',
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#212529' }}>
                                              {testCase.testCaseName || `Test Case ${testCase.testCase}`}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                              {testCase.time !== undefined && (
                                                <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>
                                                  {testCase.time}ms
                                                </span>
                                              )}
                                              {testCase.memory !== undefined && (
                                                <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>
                                                  {testCase.memory}KB
                                                </span>
                                              )}
                                              <span
                                                style={{
                                                  backgroundColor: verdictColor + '40',
                                                  color: verdictColor,
                                                  fontSize: '0.55rem',
                                                  fontWeight: 'bold',
                                                  padding: '3px 6px',
                                                  border: '2px solid ' + verdictColor,
                                                }}
                                              >
                                                {testCase.verdict}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Show details for admins - all test cases */}
                                          <div style={{ fontSize: '0.6rem', color: '#4b5563', lineHeight: '1.6' }}>
                                            {testCase.inputParameters && (
                                              <div style={{ marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#212529' }}>Input: </span>
                                                <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', border: '1px solid #d1d5db', fontFamily: "'Courier New', monospace" }}>
                                                  {typeof testCase.inputParameters === 'string'
                                                    ? testCase.inputParameters
                                                    : JSON.stringify(testCase.inputParameters)}
                                                </code>
                                              </div>
                                            )}
                                            {testCase.expectedReturn !== undefined && (
                                              <div style={{ marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#212529' }}>Expected: </span>
                                                <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', border: '1px solid #d1d5db', fontFamily: "'Courier New', monospace" }}>
                                                  {typeof testCase.expectedReturn === 'string'
                                                    ? testCase.expectedReturn
                                                    : JSON.stringify(testCase.expectedReturn)}
                                                </code>
                                              </div>
                                            )}
                                            {testCase.actualOutput !== undefined && (
                                              <div style={{ marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#212529' }}>Actual: </span>
                                                <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', border: '1px solid #d1d5db', fontFamily: "'Courier New', monospace" }}>
                                                  {testCase.actualOutput}
                                                </code>
                                              </div>
                                            )}
                                            {testCase.error && (
                                              <div style={{ marginTop: '6px', color: '#dc2626' }}>
                                                <span style={{ fontWeight: 'bold' }}>Error: </span>
                                                {testCase.error}
                                              </div>
                                            )}
                                            {testCase.explanation && (
                                              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#6b7280' }}>
                                                {testCase.explanation}
                                              </div>
                                            )}
                                            {testCase.isHidden && (
                                              <div style={{ marginTop: '6px', fontSize: '0.55rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                (Hidden test case)
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              );
                            }
                          } catch (e) {
                            return (
                              <>
                                <h4 style={{ fontSize: '0.7rem', marginTop: '12px', marginBottom: '8px', color: '#212529' }}>Judge Output:</h4>
                                <pre
                                  style={{
                                    backgroundColor: '#f9fafb',
                                    color: '#212529',
                                    padding: '12px',
                                    border: '3px solid #212529',
                                    fontSize: '0.6rem',
                                    lineHeight: '1.5',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                    fontFamily: "'Courier New', monospace",
                                  }}
                                >
                                  {typeof submission.judge_output === 'string'
                                    ? submission.judge_output
                                    : JSON.stringify(submission.judge_output, null, 2)}
                                </pre>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamDetailPage;
