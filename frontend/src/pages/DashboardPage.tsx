/**
 * CS Club Hackathon Platform - Team Dashboard Page (Real Data Implementation)
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import '../styles/theme.css';

interface Contest {
  id: number;
  name: string;
  description: string;
  status: 'upcoming' | 'active' | 'frozen' | 'ended';
  start_time: string;
  duration_minutes: number;
  time_remaining: number;
  progress_percentage: number;
}

interface TeamStats {
  rank: number;
  total_submissions: number;
  accepted_submissions: number;
  problems_solved: number;
  total_problems: number;
  accuracy_rate: string;
}

interface Problem {
  id: number;
  letter: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_solved: boolean;
  attempt_count: number;
  first_submission?: string;
  solved_at?: string;
}

interface Submission {
  id: number;
  problem_letter: string;
  problem_title: string;
  language: string;
  verdict: string;
  submitted_at: string;
  execution_time?: number;
  memory_used?: number;
}

interface DashboardData {
  contest: Contest;
  team_stats: TeamStats;
  verdict_distribution: Record<string, number>;
  problems: Problem[];
  recent_submissions: Submission[];
}

interface StandingsEntry {
  rank: number;
  team_id: number;
  team_name: string;
  problems_solved: number;
  penalty_time: number;
  last_submission?: string;
}

const processSimpleMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'standings' | 'activity' | 'projects'>('overview');
  
  // Project submission state
  const [projectSubmission, setProjectSubmission] = useState<any>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [submittingProject, setSubmittingProject] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'projects' && dashboardData?.contest?.id && !projectSubmission) {
      fetchProjectSubmission();
    }
  }, [activeTab, dashboardData?.contest?.id]);

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

  const fetchProjectSubmission = async () => {
    try {
      if (dashboardData?.contest?.id) {
        const response = await apiService.getTeamProjectSubmission(dashboardData.contest.id);
        if (response.success && response.data) {
          setProjectSubmission(response.data);
          setProjectTitle(response.data.project_title || '');
          setProjectDescription(response.data.project_description || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch project submission:', err);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectFile && !projectSubmission) {
      setError('Please select a project file to upload');
      return;
    }
    
    if (!projectTitle) {
      setError('Please enter a project title');
      return;
    }

    setSubmittingProject(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (projectFile) {
        formData.append('project_file', projectFile);
      }
      formData.append('project_title', projectTitle);
      formData.append('project_description', projectDescription);

      const result = await apiService.submitProject(dashboardData!.contest.id, formData);

      if (result.success) {
        await fetchProjectSubmission(); // Refresh the project submission data
        if (projectFile) {
          setProjectFile(null);
          // Reset file input
          const fileInput = document.getElementById('project-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        setError(result.message || 'Failed to submit project');
      }
    } catch (err) {
      setError('Failed to submit project. Please try again.');
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
        setError('Please select a ZIP file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB
        setError('File size must be less than 100MB');
        return;
      }
      setProjectFile(file);
      setError(null);
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

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Header */}
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
          {dashboardData.contest.name}
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
            __html: processSimpleMarkdown(dashboardData.contest.description) 
          }}
        />
        
        {/* Contest Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            backgroundColor: dashboardData.contest.status === 'active' ? '#dcfce7' :
                           dashboardData.contest.status === 'frozen' ? '#fef3c7' :
                           dashboardData.contest.status === 'ended' ? '#f3f4f6' :
                           '#dbeafe',
            color: dashboardData.contest.status === 'active' ? '#166534' :
                   dashboardData.contest.status === 'frozen' ? '#a16207' :
                   dashboardData.contest.status === 'ended' ? '#6b7280' :
                   '#1d4ed8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            {dashboardData.contest.status}
          </span>
          
          {dashboardData.contest.status === 'active' && (
            <span style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              fontWeight: 500,
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Time Remaining: {formatTime(dashboardData.contest.time_remaining)}
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
                  width: `${dashboardData.contest.progress_percentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
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
          { key: 'projects', label: 'Project Submission' },
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {/* Team Statistics */}
          <div style={{
            gridColumn: { lg: 'span 2' },
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
                  }}>{dashboardData.team_stats.rank}</div>
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
                  }}>{dashboardData.team_stats.problems_solved}</div>
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
                  }}>{dashboardData.team_stats.total_submissions}</div>
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
                  }}>{dashboardData.team_stats.accuracy_rate}%</div>
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

          {/* Verdict Distribution */}
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
                {Object.entries(dashboardData.verdict_distribution).map(([verdict, count]) => {
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

          {/* Recent Submissions */}
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
              {dashboardData.recent_submissions.length === 0 ? (
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
                      {dashboardData.recent_submissions.slice(0, 5).map((submission) => {
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
                              {submission.problem_letter} - {submission.problem_title}
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
                            {problem.is_solved ? (
                              <span className="badge bg-success">Solved</span>
                            ) : problem.attempt_count > 0 ? (
                              <span className="badge bg-warning">Attempted</span>
                            ) : (
                              <span className="badge bg-secondary">Not Attempted</span>
                            )}
                          </td>
                          <td>{problem.attempt_count}</td>
                          <td>
                            {problem.solved_at 
                              ? new Date(problem.solved_at).toLocaleString()
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
                        <tr key={team.team_id}>
                          <td>
                            <strong>#{team.rank}</strong>
                          </td>
                          <td>{team.team_name}</td>
                          <td>{team.problems_solved}</td>
                          <td>{Math.floor(team.penalty_time / 60)}:{(team.penalty_time % 60).toString().padStart(2, '0')}</td>
                          <td>
                            {team.last_submission 
                              ? new Date(team.last_submission).toLocaleString()
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
                            <td>{activity.team_name}</td>
                            <td>{activity.problem_letter} - {activity.problem_title}</td>
                            <td>{activity.language}</td>
                            <td className={getVerdictColor(activity.verdict)}>{activity.verdict}</td>
                            <td>{activity.execution_time ? `${activity.execution_time}ms` : '-'}</td>
                            <td>{new Date(activity.submitted_at).toLocaleString()}</td>
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

      {activeTab === 'projects' && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Project Submission
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              marginTop: '8px',
              margin: '8px 0 0 0',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Upload your hackathon project as a ZIP file. You can update your submission until the contest ends.
            </p>
          </div>
          
          <div style={{ padding: '24px' }}>
            {projectSubmission && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#0c4a6e',
                  margin: '0 0 8px 0',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Current Submission: {projectSubmission.project_title}
                </h4>
                <p style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '0.9rem' }}>
                  <strong>File:</strong> {projectSubmission.original_filename}
                </p>
                <p style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '0.9rem' }}>
                  <strong>Size:</strong> {(projectSubmission.file_size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <p style={{ margin: '0', color: '#0c4a6e', fontSize: '0.9rem' }}>
                  <strong>Last Updated:</strong> {new Date(projectSubmission.updated_at || projectSubmission.submitted_at).toLocaleString()}
                </p>
                {projectSubmission.project_description && (
                  <p style={{ margin: '12px 0 0 0', color: '#0c4a6e', fontSize: '0.9rem' }}>
                    <strong>Description:</strong> {projectSubmission.project_description}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleProjectSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Enter your project title"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Project Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project, technologies used, and key features"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Project File (ZIP) {!projectSubmission ? '*' : ''}
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                }}>
                  <input
                    id="project-file-input"
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="project-file-input"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                  >
                    <div style={{
                      fontSize: '48px',
                      color: '#6b7280',
                      marginBottom: '12px',
                    }}>
                      📁
                    </div>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#1d4ed8',
                      marginBottom: '8px',
                    }}>
                      {projectFile ? projectFile.name : 'Click to select ZIP file'}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#6b7280',
                    }}>
                      {projectFile ? 
                        `${(projectFile.size / (1024 * 1024)).toFixed(2)} MB` : 
                        'Maximum file size: 100MB'
                      }
                    </div>
                  </label>
                  {projectFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setProjectFile(null);
                        const fileInput = document.getElementById('project-file-input') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      style={{
                        marginTop: '12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingProject || (!projectTitle || (!projectFile && !projectSubmission))}
                style={{
                  background: (submittingProject || (!projectTitle || (!projectFile && !projectSubmission))) ? 
                    '#9ca3af' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: (submittingProject || (!projectTitle || (!projectFile && !projectSubmission))) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                {submittingProject ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Submitting...
                  </>
                ) : (
                  <>
                    📤 {projectSubmission ? 'Update Project' : 'Submit Project'}
                  </>
                )}
              </button>
            </form>
            
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#92400e',
            }}>
              <strong>Note:</strong> Only ZIP files are accepted. Make sure your project includes all necessary files, documentation, and a README file explaining how to run your project.
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
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