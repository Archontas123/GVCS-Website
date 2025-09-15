import React, { useState, useEffect } from 'react';
import { 
  MdCheck, 
  MdAccessTime, 
  MdClose, 
  MdCode, 
  MdTimer, 
  MdStorage, 
  MdBarChart,
  MdRefresh,
  MdFilterList,
  MdTrendingUp
} from 'react-icons/md';

interface Submission {
  id: number;
  team_name: string;
  problem_letter: string;
  problem_title: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error' | 'memory_limit_exceeded';
  submission_time: string;
  judged_at?: string;
  execution_time?: number;
  memory_used?: number;
  contest_name: string;
  verdict_details?: string;
}

interface SubmissionStats {
  submissions_per_minute: number;
  language_usage: { [key: string]: number };
  verdict_distribution: { [key: string]: number };
  average_judging_time: number;
  total_submissions_today: number;
  pending_count: number;
}

const SubmissionFeedDisplay: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    submissions_per_minute: 0,
    language_usage: {},
    verdict_distribution: {},
    average_judging_time: 0,
    total_submissions_today: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [contestFilter, setContestFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSubmissions = async () => {
    try {
      const [submissionsResponse, statsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/admin/submissions/live?limit=50', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/submissions/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/submissions/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        if (submissionsData.success) {
          setSubmissions(submissionsData.data || []);
        }
      }

      if (statsResponse.ok && analyticsResponse.ok) {
        const [statsData, analyticsData] = await Promise.all([
          statsResponse.json(),
          analyticsResponse.json()
        ]);

        if (statsData.success && analyticsData.success) {
          setStats({
            submissions_per_minute: statsData.data.submissions_per_minute || 0,
            average_judging_time: statsData.data.average_judging_time || 0,
            total_submissions_today: statsData.data.total_submissions_today || 0,
            pending_count: statsData.data.pending_count || 0,
            language_usage: analyticsData.data.language_usage || {},
            verdict_distribution: analyticsData.data.verdict_distribution || {}
          });
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'pending': return 'info';
      case 'wrong_answer': return 'error';
      case 'compilation_error': return 'warning';
      case 'time_limit_exceeded': return 'secondary';
      case 'runtime_error': return 'error';
      case 'memory_limit_exceeded': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <MdCheck />;
      case 'pending': return <MdAccessTime />;
      case 'wrong_answer': return <MdClose />;
      case 'compilation_error': return <MdCode />;
      case 'time_limit_exceeded': return <MdTimer />;
      case 'runtime_error': return <MdClose />;
      case 'memory_limit_exceeded': return <MdStorage />;
      default: return <MdBarChart />;
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'cpp': return '#00549d';
      case 'java': return '#f89820';
      case 'python': return '#3776ab';
      default: return '#666';
    }
  };

  const formatTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (contestFilter !== 'all' && sub.contest_name !== contestFilter) return false;
    if (languageFilter !== 'all' && sub.language !== languageFilter) return false;
    
    switch (selectedTab) {
      case 0: return true;
      case 1: return sub.status === 'pending';
      case 2: return sub.status === 'accepted';
      case 3: return sub.status !== 'pending' && sub.status !== 'accepted';
      default: return true;
    }
  });

  const uniqueContests = [...new Set(submissions.map(s => s.contest_name))];
  const uniqueLanguages = [...new Set(submissions.map(s => s.language))];

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#1d4ed8',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Real-time Submission Feed
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <div style={{ position: 'relative' }}>
              <button
                onClick={fetchSubmissions}
                title="Refresh"
                style={{
                  padding: '8px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <MdRefresh style={{ fontSize: '16px' }} />
              </button>
              {stats.pending_count > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {stats.pending_count > 99 ? '99+' : stats.pending_count}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth >= 640 ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#1d4ed8',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <MdTimer />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.submissions_per_minute.toFixed(1)}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Per Minute
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#0891b2',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <MdBarChart />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.total_submissions_today}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Today Total
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#0891b2',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <MdAccessTime />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.average_judging_time.toFixed(1)}s
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Avg. Judge Time
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#f59e0b',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <MdTrendingUp />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {stats.pending_count}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Pending
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: '24px'
        }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
            }}>
              <div style={{
                borderBottom: '1px solid #e5e7eb',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {[
                    { label: `All (${submissions.length})`, index: 0 },
                    { label: 'Pending', index: 1, badge: submissions.filter(s => s.status === 'pending').length },
                    { label: `Accepted (${submissions.filter(s => s.status === 'accepted').length})`, index: 2 },
                    { label: `Rejected (${submissions.filter(s => s.status !== 'pending' && s.status !== 'accepted').length})`, index: 3 }
                  ].map(tab => (
                    <button
                      key={tab.index}
                      onClick={() => setSelectedTab(tab.index)}
                      style={{
                        padding: '12px 20px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: selectedTab === tab.index ? '#1d4ed8' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: selectedTab === tab.index ? 600 : 500,
                        fontSize: '0.95rem',
                        borderBottom: `3px solid ${selectedTab === tab.index ? '#1d4ed8' : 'transparent'}`,
                        transition: 'all 0.2s ease',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTab !== tab.index) {
                          e.currentTarget.style.color = '#4b5563';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTab !== tab.index) {
                          e.currentTarget.style.color = '#6b7280';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {tab.label}
                      {tab.badge && tab.badge > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          minWidth: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          {tab.badge > 99 ? '99+' : tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <MdFilterList style={{ fontSize: '20px', color: '#6b7280' }} />
                  <div style={{ minWidth: '120px' }}>
                    <select
                      value={contestFilter}
                      onChange={(e) => setContestFilter(e.target.value)}
                      style={{
                        width: '100%',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        cursor: 'pointer',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1d4ed8';
                        e.target.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <option value="all">All Contests</option>
                      {uniqueContests.map(contest => (
                        <option key={contest} value={contest}>{contest}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ minWidth: '120px' }}>
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      style={{
                        width: '100%',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        cursor: 'pointer',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1d4ed8';
                        e.target.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <option value="all">All Languages</option>
                      {uniqueLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{
                padding: 0,
                maxHeight: '500px',
                overflow: 'auto'
              }}>
                {loading ? (
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #e5e7eb 25%, transparent 25%, transparent 50%, #e5e7eb 50%, #e5e7eb 75%, transparent 75%, transparent)',
                      backgroundSize: '40px 100%',
                      animation: 'loading 1s linear infinite'
                    }} />
                  </div>
                ) : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <tr>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Team</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Problem</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Language</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Status</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Time</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} style={{
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.875rem',
                            color: '#1f2937'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                marginRight: '12px'
                              }}>
                                {submission.team_name.charAt(0)}
                              </div>
                              <span style={{ fontWeight: 500 }}>
                                {submission.team_name}
                              </span>
                            </div>
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.875rem',
                            color: '#1f2937'
                          }}>
                            <div>
                              <div style={{
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: '#1f2937'
                              }}>
                                {submission.problem_letter}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '2px'
                              }}>
                                {submission.problem_title}
                              </div>
                            </div>
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.875rem'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: getLanguageColor(submission.language) + '20',
                              color: getLanguageColor(submission.language)
                            }}>
                              {submission.language.toUpperCase()}
                            </span>
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.875rem'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              backgroundColor: getStatusColor(submission.status) === 'success' ? '#dcfce7' :
                                              getStatusColor(submission.status) === 'warning' ? '#fef3c7' :
                                              getStatusColor(submission.status) === 'error' ? '#fecaca' : '#f3f4f6',
                              color: getStatusColor(submission.status) === 'success' ? '#166534' :
                                     getStatusColor(submission.status) === 'warning' ? '#92400e' :
                                     getStatusColor(submission.status) === 'error' ? '#dc2626' : '#374151'
                            }}>
                              <span style={{ fontSize: '14px' }}>{getStatusIcon(submission.status)}</span>
                              {submission.status.replace('_', ' ')}
                            </div>
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {formatTime(submission.submission_time)}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '0.75rem'
                          }}>
                            {submission.execution_time !== undefined && (
                              <div>
                                <div style={{
                                  color: '#1f2937',
                                  fontWeight: 500
                                }}>
                                  {submission.execution_time}ms
                                </div>
                                {submission.memory_used && (
                                  <div style={{
                                    color: '#6b7280',
                                    fontSize: '0.7rem',
                                    marginTop: '2px'
                                  }}>
                                    {(submission.memory_used / 1024).toFixed(1)}KB
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <style>
                {`
                  @keyframes loading {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 40px 0%; }
                  }
                `}
              </style>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MdCode style={{ fontSize: '20px', color: '#1d4ed8' }} />
                  Language Usage
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(stats.language_usage).map(([language, percentage]) => (
                    <div key={language} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          marginBottom: '6px'
                        }}>
                          {language.toUpperCase()}
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: getLanguageColor(language),
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginLeft: '16px'
                      }}>
                        {percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MdBarChart style={{ fontSize: '20px', color: '#1d4ed8' }} />
                  Verdict Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(stats.verdict_distribution).map(([verdict, percentage]) => (
                    <div key={verdict} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          marginBottom: '8px',
                          backgroundColor: getStatusColor(verdict) === 'success' ? '#dcfce7' :
                                          getStatusColor(verdict) === 'warning' ? '#fef3c7' :
                                          getStatusColor(verdict) === 'error' ? '#fecaca' : '#f3f4f6',
                          color: getStatusColor(verdict) === 'success' ? '#166534' :
                                 getStatusColor(verdict) === 'warning' ? '#92400e' :
                                 getStatusColor(verdict) === 'error' ? '#dc2626' : '#374151'
                        }}>
                          {verdict.replace('_', ' ')}
                        </div>
                        <div style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: getStatusColor(verdict) === 'success' ? '#22c55e' :
                                            getStatusColor(verdict) === 'warning' ? '#f59e0b' :
                                            getStatusColor(verdict) === 'error' ? '#ef4444' : '#9ca3af',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginLeft: '16px'
                      }}>
                        {percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default SubmissionFeedDisplay;