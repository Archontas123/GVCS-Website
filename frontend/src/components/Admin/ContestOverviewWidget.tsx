
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmojiEvents, MdBarChart, MdTrendingUp, MdRefresh, MdSettings, MdAccessTime, MdPeople } from 'react-icons/md';

interface ContestStats {
  total_submissions: number;
  problems_solved: number;
  team_participation_rate: number;
  average_solve_time: number;
}

interface ActiveContest {
  id: number;
  contest_name: string;
  status: 'pending_manual' | 'not_started' | 'running' | 'frozen' | 'ended';
  manual_control?: boolean;
  registration_code: string;
  teams_count: number;
  submissions_count: number;
  stats: ContestStats;
}

interface ContestOverviewWidgetProps {
  refreshInterval?: number;
}

const ContestOverviewWidget: React.FC<ContestOverviewWidgetProps> = ({ 
  refreshInterval = 30000 
}) => {
  const navigate = useNavigate();
  const [activeContests, setActiveContests] = useState<ActiveContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchActiveContests();
    const interval = setInterval(fetchActiveContests, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchActiveContests = async () => {
    try {
      const response = await fetch('/api/admin/contests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contests');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const contestPromises = result.data
          .filter((contest: any) => contest.is_active)
          .map(async (contest: any) => {
            try {
              const progressResponse = await fetch(`/api/admin/contests/${contest.id}/progress`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const progressData = await progressResponse.json();
              const progress = progressData.success ? progressData.data : null;
              const statsResponse = await fetch(`/api/admin/contests/${contest.id}/live-stats`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const statsData = await statsResponse.json();
              const liveStats = statsData.success ? statsData.data : null;
              
              return {
                id: contest.id,
                contest_name: contest.contest_name,
                status: progress?.status || 'not_started',
                manual_control: progress?.manual_control ?? contest.manual_control ?? true,
                registration_code: contest.registration_code,
                teams_count: liveStats?.teams_count || 0,
                submissions_count: liveStats?.submissions_count || 0,
                stats: {
                  total_submissions: liveStats?.submissions_count || 0,
                  problems_solved: liveStats?.problems_solved || 0,
                  team_participation_rate: liveStats?.participation_rate || 0,
                  average_solve_time: liveStats?.avg_solve_time || 0
                }
              };
            } catch (error) {
              console.error(`Error fetching progress for contest ${contest.id}:`, error);
              return null;
            }
          });
        
        const contests = await Promise.all(contestPromises);
        const validContests = contests.filter(contest => contest !== null) as ActiveContest[];
        
        setActiveContests(validContests);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch active contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'frozen': return 'warning';
      case 'ended': return 'default';
      default: return 'info';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_manual': return 'Awaiting Start';
      case 'not_started': return 'Not Started';
      case 'running': return 'Running';
      case 'frozen': return 'Frozen';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          Contest Overview
        </h2>
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
        <style>
          {`
            @keyframes loading {
              0% { background-position: 0% 0%; }
              100% { background-position: 40px 0%; }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto'
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
          Active Contests
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchActiveContests}
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
        </div>
      </div>

      {activeContests.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '64px 32px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            color: '#6b7280',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <MdEmojiEvents style={{ fontSize: '64px' }} />
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            No active contests
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            marginBottom: '32px',
            lineHeight: 1.6
          }}>
            All contests have ended or haven't started yet
          </p>
          <button
            onClick={() => navigate('/admin/contests')}
            style={{
              padding: '12px 24px',
              border: '2px solid #1d4ed8',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
            }}
          >
            Manage Contests
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
          gap: '24px'
        }}>
          {activeContests.map((contest) => (
            <div key={contest.id} style={{
              flex: window.innerWidth >= 1024 ? 1 : 'none',
              minWidth: 0
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '12px'
                      }}>
                        {contest.contest_name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: getStatusColor(contest.status) === 'success' ? '#dcfce7' :
                                          getStatusColor(contest.status) === 'warning' ? '#fef3c7' :
                                          getStatusColor(contest.status) === 'info' ? '#dbeafe' : '#f3f4f6',
                          color: getStatusColor(contest.status) === 'success' ? '#166534' :
                                 getStatusColor(contest.status) === 'warning' ? '#92400e' :
                                 getStatusColor(contest.status) === 'info' ? '#1e40af' : '#374151'
                        }}>
                          {getStatusText(contest.status)}
                        </span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          Code: {contest.registration_code}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/contests/${contest.id}`)}
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
                      <MdSettings style={{ fontSize: '16px' }} />
                    </button>
                  </div>


                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      padding: '16px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '6px'
                      }}>
                        <MdPeople style={{
                          fontSize: '20px',
                          marginRight: '6px',
                          color: '#1d4ed8'
                        }} />
                        <span style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          {contest.teams_count}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Teams
                      </span>
                    </div>
                    <div style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      padding: '16px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '6px'
                      }}>
                        <MdBarChart style={{
                          fontSize: '20px',
                          marginRight: '6px',
                          color: '#0891b2'
                        }} />
                        <span style={{
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          {contest.submissions_count}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Submissions
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      marginBottom: '12px',
                      fontWeight: 500
                    }}>
                      Performance Metrics
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#dcfce7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#166534'
                        }}>
                          <MdTrendingUp style={{ fontSize: '16px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: '#1f2937',
                            marginBottom: '2px'
                          }}>
                            Problems Solved
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {contest.stats.problems_solved} total
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          {contest.stats.team_participation_rate.toFixed(1)}%
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1e40af'
                        }}>
                          <MdAccessTime style={{ fontSize: '16px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: '#1f2937',
                            marginBottom: '2px'
                          }}>
                            Avg. Solve Time
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            Per problem
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          {contest.stats.average_solve_time.toFixed(1)}m
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContestOverviewWidget;
