import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import '../styles/theme.css';

interface Contest {
  id: number;
  name: string;
  description: string;
  status: 'pending_manual' | 'upcoming' | 'active' | 'frozen' | 'ended';
  start_time: string | null;
  duration_minutes: number | null;
  freeze_time_minutes?: number | null;
  manual_control?: boolean;
  time_remaining: number;
  progress_percentage: number;
}

interface TeamStats {
  rank: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  problemsSolved: number;
  totalProblems: number;
  accuracyRate: string;
}

interface Problem {
  id: number;
  letter: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSolved: boolean;
  attemptCount: number;
  firstSubmission?: string;
  solvedAt?: string;
}

interface Submission {
  id: number;
  problemLetter: string;
  problemTitle: string;
  language: string;
  verdict: string;
  submittedAt: string;
  executionTime?: number;
  memoryUsed?: number;
}

interface DashboardData {
  contest: Contest;
  teamStats: TeamStats;
  verdictDistribution: Record<string, number>;
  problems: Problem[];
  recentSubmissions: Submission[];
}

interface StandingsEntry {
  rank: number;
  teamId: number;
  teamName: string;
  problemsSolved: number;
  penaltyTime: number;
  lastSubmission?: string;
}

const processSimpleMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

const contestStatusMeta: Record<Contest['status'], { label: string; bg: string; color: string }> = {
  pending_manual: { label: 'Awaiting Start', bg: '#e0e7ff', color: '#3730a3' },
  upcoming: { label: 'Scheduled', bg: '#dbeafe', color: '#1d4ed8' },
  active: { label: 'In Progress', bg: '#dcfce7', color: '#166534' },
  frozen: { label: 'Frozen', bg: '#fef3c7', color: '#a16207' },
  ended: { label: 'Completed', bg: '#f3f4f6', color: '#6b7280' },
};

const shouldShowTimer = (contest: Contest): boolean => {
  if (contest.status !== 'active') {
    return false;
  }

  if (contest.manual_control && (contest.duration_minutes === null || contest.duration_minutes <= 0)) {
    return false;
  }

  return contest.time_remaining > 0;
};

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'standings' | 'activity'>('overview');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      const [overviewData, standingsData, activityData] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getDashboardStandings(),
        apiService.getDashboardActivity(15)
      ]);

      setDashboardData(overviewData.data);
      setStandings(standingsData.data);
      setRecentActivity(activityData.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getVerdictColor = (verdict: string): string => {
    switch (verdict) {
      case 'AC': return 'text-success';
      case 'WA': return 'text-danger';
      case 'TLE': return 'text-warning';
      case 'CE': return 'text-info';
      case 'RE': return 'text-secondary';
      default: return 'text-muted';
    }
  };

  const getDifficultyBadge = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'badge bg-success';
      case 'medium': return 'badge bg-warning';
      case 'hard': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Dashboard</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container p-4">
        <div className="alert alert-warning">No dashboard data available</div>
      </div>
    );
  }

  const contest = dashboardData.contest;
  const statusMeta = contestStatusMeta[contest.status] ?? contestStatusMeta.upcoming;
  const showTimer = shouldShowTimer(contest);
  const isManual = contest.manual_control ?? true;
  const showManualPendingMessage = isManual && contest.status === 'pending_manual';
  const showManualActiveMessage = isManual && contest.status === 'active' && !showTimer;

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    }}>
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        padding: '32px',
        marginBottom: '24px',
      }}>
        <h1 style={{ 
          fontWeight: 700, 
          fontSize: '2.5rem',
          color: '#1f2937',
          marginBottom: '12px',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        }}>
          {contest.name}
        </h1>
        <div 
          style={{
            color: '#6b7280',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            marginBottom: '24px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}
          dangerouslySetInnerHTML={{ 
            __html: processSimpleMarkdown(contest.description) 
          }}
        />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            backgroundColor: statusMeta.bg,
            color: statusMeta.color,
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            {statusMeta.label}
          </span>

          {isManual && (
            <span style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Manual Control
            </span>
          )}
          
          {showTimer && (
            <span style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              fontWeight: 500,
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Time Remaining: {formatTime(contest.time_remaining)}
            </span>
          )}
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ 
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div 
                style={{ 
                  height: '100%',
                  backgroundColor: '#1d4ed8',
                  width: `${contest.progress_percentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {(showManualPendingMessage || showManualActiveMessage) && (
          <div
            style={{
              marginTop: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#4b5563',
              fontSize: '0.9rem',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}
          >
            {showManualPendingMessage
              ? 'Contest will begin once an organizer starts it. Keep this page open for updates.'
              : 'Contest is running in manual mode; organizers will announce when it ends.'}
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'problems', label: 'Problems' },
          { key: 'standings', label: 'Standings' },
          { key: 'activity', label: 'Recent Activity' },
        ].map((tab) => (
          <button 
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              background: activeTab === tab.key 
                ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' 
                : '#ffffff',
              color: activeTab === tab.key ? 'white' : '#374151',
              border: activeTab === tab.key ? 'none' : '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: activeTab === tab.key 
                ? '0 4px 12px rgba(29, 78, 216, 0.25)' 
                : '0 2px 4px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#1d4ed8';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          <div style={{
            gridColumn: 'span 2',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Team Statistics
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '24px',
                textAlign: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: '#1d4ed8',
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>{dashboardData.teamStats.rank}</div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Current Rank</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>{dashboardData.teamStats.problemsSolved}</div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Problems Solved</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: '#0ea5e9',
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>{dashboardData.teamStats.totalSubmissions}</div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Total Submissions</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: '#f59e0b',
                    marginBottom: '4px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>{dashboardData.teamStats.accuracyRate}%</div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: 500,
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>Accuracy Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Submission Results
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(dashboardData.verdictDistribution).map(([verdict, count]) => {
                  const verdictColors = {
                    'AC': { color: '#16a34a', bg: '#dcfce7' },
                    'WA': { color: '#dc2626', bg: '#fef2f2' },
                    'TLE': { color: '#f59e0b', bg: '#fef3c7' },
                    'CE': { color: '#0ea5e9', bg: '#dbeafe' },
                    'RE': { color: '#6b7280', bg: '#f3f4f6' },
                  };
                  const colors = verdictColors[verdict as keyof typeof verdictColors] || { color: '#6b7280', bg: '#f3f4f6' };
                  
                  return (
                    <div key={verdict} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{
                        color: colors.color,
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      }}>{verdict}</span>
                      <span style={{
                        backgroundColor: colors.bg,
                        color: colors.color,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Recent Submissions
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              {dashboardData.recentSubmissions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  No submissions yet
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontWeight: 600,
                          color: '#374151',
                        }}>Problem</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontWeight: 600,
                          color: '#374151',
                        }}>Language</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontWeight: 600,
                          color: '#374151',
                        }}>Verdict</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontWeight: 600,
                          color: '#374151',
                        }}>Time</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontWeight: 600,
                          color: '#374151',
                        }}>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentSubmissions.slice(0, 5).map((submission) => {
                        const verdictColors = {
                          'AC': { color: '#16a34a', bg: '#dcfce7' },
                          'WA': { color: '#dc2626', bg: '#fef2f2' },
                          'TLE': { color: '#f59e0b', bg: '#fef3c7' },
                          'CE': { color: '#0ea5e9', bg: '#dbeafe' },
                          'RE': { color: '#6b7280', bg: '#f3f4f6' },
                        };
                        const colors = verdictColors[submission.verdict as keyof typeof verdictColors] || { color: '#6b7280', bg: '#f3f4f6' };
                        
                        return (
                          <tr 
                            key={submission.id}
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background-color 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <td style={{ padding: '12px 8px', color: '#374151', fontWeight: 500 }}>
                              {submission.problemLetter} - {submission.problemTitle}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                              }}>
                                {submission.language}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{
                                backgroundColor: colors.bg,
                                color: colors.color,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}>
                                {submission.verdict}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                              {submission.execution_time ? `${submission.execution_time}ms` : '-'}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                              {new Date(submission.submitted_at).toLocaleTimeString()}
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
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Contest Problems</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Solved At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.problems.map((problem) => (
                        <tr key={problem.id}>
                          <td>
                            <strong>{problem.letter}</strong> - {problem.title}
                          </td>
                          <td>
                            <span className={getDifficultyBadge(problem.difficulty)}>
                              {problem.difficulty}
                            </span>
                          </td>
                          <td>
                            {problem.isSolved ? (
                              <span className="badge bg-success">Solved</span>
                            ) : problem.attemptCount > 0 ? (
                              <span className="badge bg-warning">Attempted</span>
                            ) : (
                              <span className="badge bg-secondary">Not Attempted</span>
                            )}
                          </td>
                          <td>{problem.attemptCount}</td>
                          <td>
                            {problem.solvedAt
                              ? new Date(problem.solvedAt).toLocaleString()
                              : '-'
                            }
                          </td>
                          <td>
                            <button className="btn btn-sm btn-primary">View Problem</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Contest Standings</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Problems Solved</th>
                        <th>Penalty Time</th>
                        <th>Last Submission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team) => (
                        <tr key={team.teamId}>
                          <td>
                            <strong>#{team.rank}</strong>
                          </td>
                          <td>{team.teamName}</td>
                          <td>{team.problemsSolved}</td>
                          <td>{team.penaltyTime.toLocaleString()}</td>
                          <td>
                            {team.lastSubmission
                              ? new Date(team.lastSubmission).toLocaleString()
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Recent Contest Activity</h5>
              </div>
              <div className="card-body">
                {recentActivity.length === 0 ? (
                  <p className="text-muted">No recent activity</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>Problem</th>
                          <th>Language</th>
                          <th>Verdict</th>
                          <th>Time</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map((activity) => (
                          <tr key={activity.id}>
                            <td>{activity.teamName}</td>
                            <td>{activity.problemLetter} - {activity.problemTitle}</td>
                            <td>{activity.language}</td>
                            <td className={getVerdictColor(activity.verdict)}>{activity.verdict}</td>
                            <td>{activity.executionTime ? `${activity.executionTime}ms` : '-'}</td>
                            <td>{new Date(activity.submittedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="position-fixed bottom-0 end-0 p-3">
        <div className="toast show" role="alert">
          <div className="toast-body d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Auto-refreshing every 30s
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
