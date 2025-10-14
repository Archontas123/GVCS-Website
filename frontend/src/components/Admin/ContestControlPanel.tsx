
import React, { useState, useEffect } from 'react';
import { 
  MdStorage, 
  MdBarChart,
  MdRefresh,
  MdPlayArrow,
  MdPause,
  MdStop,
  MdWarning,
  MdSchedule,
  MdTimer,
  MdSettings
} from 'react-icons/md';

interface Contest {
  id: number;
  contest_name: string;
  status: 'pending_manual' | 'not_started' | 'running' | 'frozen' | 'ended';
  start_time?: string | null;
  duration?: number | null;
  manual_control?: boolean;
  time_remaining_seconds: number;
  progress_percentage: number;
  teams_count: number;
  registration_code: string;
}

interface SystemStatus {
  judge_queue: {
    pending: number;
    processing: number;
    workers_active: number;
    avg_processing_time: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connections: number;
    response_time: number;
  };
  server: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
  };
  contests_scheduler: {
    status: 'running' | 'stopped';
    last_check: string;
    scheduled_tasks: number;
  };
}

const ContestControlPanel: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    judge_queue: { pending: 0, processing: 0, workers_active: 0, avg_processing_time: 0 },
    database: { status: 'disconnected', connections: 0, response_time: 0 },
    server: { cpu_usage: 0, memory_usage: 0, disk_usage: 0, uptime: 0 },
    contests_scheduler: { status: 'stopped', last_check: '', scheduled_tasks: 0 }
  });
  const [controlDialog, setControlDialog] = useState<{
    open: boolean;
    action: 'start' | 'freeze' | 'end' | 'emergency_stop' | null;
  }>({ open: false, action: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContests();
    fetchSystemStatus();
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchContests = async () => {
    try {
      const response = await fetch('/api/admin/contests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const contestPromises = result.data.map(async (contest: any) => {
            try {
              const progressResponse = await fetch(`/api/admin/contests/${contest.id}/progress`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const progressData = await progressResponse.json();
              const progress = progressData.success ? progressData.data : null;
              
              return {
                id: contest.id,
                contest_name: contest.contest_name,
                status: progress?.status || 'not_started',
                start_time: contest.start_time || null,
                duration: contest.duration ?? null,
                manual_control: progress?.manual_control ?? contest.manual_control ?? true,
                time_remaining_seconds: progress?.time_remaining_seconds || 0,
                progress_percentage: progress?.progress_percentage || 0,
                teams_count: contest.teams_count || 0,
                registration_code: contest.registration_code
              };
            } catch (error) {
              console.error(`Error fetching progress for contest ${contest.id}:`, error);
              return {
                id: contest.id,
                contest_name: contest.contest_name,
                status: 'not_started' as const,
                start_time: contest.start_time || null,
                duration: contest.duration ?? null,
                manual_control: contest.manual_control ?? true,
                time_remaining_seconds: 0,
                progress_percentage: 0,
                teams_count: 0,
                registration_code: contest.registration_code
              };
            }
          });
          
          const contests = await Promise.all(contestPromises);
          setContests(contests);
          
          if (!selectedContest && contests.length > 0) {
            setSelectedContest(contests[0]);
          }
        }
      } else {
        console.error('Failed to fetch contests - API error');
        setContests([]);
      }
    } catch (error) {
      console.error('Failed to fetch contests:', error);
      setContests([]);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          setSystemStatus({
            judge_queue: {
              pending: data.judge_queue?.pending || 0,
              processing: data.judge_queue?.processing || 0,
              workers_active: data.judge_queue?.workers_active || 0,
              avg_processing_time: data.judge_queue?.avg_processing_time || 0
            },
            database: {
              status: data.database?.status || 'connected',
              connections: data.database?.connections || 0,
              response_time: data.database?.response_time || 0
            },
            server: {
              cpu_usage: data.server?.cpu_usage || 0,
              memory_usage: data.server?.memory_usage || 0,
              disk_usage: data.server?.disk_usage || 0,
              uptime: data.server?.uptime || 0
            },
            contests_scheduler: {
              status: data.contests_scheduler?.status || 'running',
              last_check: data.contests_scheduler?.last_check || new Date().toISOString(),
              scheduled_tasks: data.contests_scheduler?.scheduled_tasks || 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const handleContestAction = (contest: Contest, action: 'start' | 'freeze' | 'end' | 'emergency_stop') => {
    setSelectedContest(contest);
    setControlDialog({ open: true, action });
  };

  const executeContestAction = async () => {
    if (!selectedContest || !controlDialog.action) return;

    setLoading(true);
    
    try {
      let endpoint = '';
      switch (controlDialog.action) {
        case 'start':
          endpoint = `/api/admin/contests/${selectedContest.id}/start`;
          break;
        case 'freeze':
          endpoint = `/api/admin/contests/${selectedContest.id}/freeze`;
          break;
        case 'end':
          endpoint = `/api/admin/contests/${selectedContest.id}/end`;
          break;
        case 'emergency_stop':
          endpoint = `/api/admin/contests/${selectedContest.id}/emergency-stop`;
          break;
        default:
          throw new Error('Invalid action');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchContests();
          setControlDialog({ open: false, action: null });
          setSelectedContest(null);
        } else {
          console.error('Contest action failed:', result.message);
        }
      } else {
        console.error('Contest action request failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to execute contest action:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'frozen': return 'warning';
      case 'ended': return 'default';
      case 'not_started': return 'info';
      default: return 'default';
    }
  };

  const getSystemHealthColor = () => {
    const { server, database, judge_queue } = systemStatus;
    if (database.status === 'disconnected' || server.cpu_usage > 90 || server.memory_usage > 95) {
      return 'error';
    }
    if (database.status === 'slow' || server.cpu_usage > 70 || judge_queue.pending > 50) {
      return 'warning';
    }
    return 'success';
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <h1 style={{
        fontWeight: 700,
        fontSize: '1.75rem',
        color: '#1d4ed8',
        marginBottom: '32px',
        letterSpacing: '-0.02em'
      }}>
        Contest Control Panel
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        gap: '24px'
      }}>
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
          }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px'
              }}>
                <h2 style={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Active Contest Controls
                </h2>
                <button
                  onClick={fetchContests}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  Refresh
                </button>
              </div>

              {contests.length === 0 ? (
                <div style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1e40af',
                  border: '1px solid #bae6fd',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  No contests available for control
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {contests.map((contest) => (
                    <div key={contest.id} style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '24px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <h3 style={{
                              fontWeight: 600,
                              fontSize: '1.125rem',
                              color: '#1f2937',
                              margin: '0 0 12px 0'
                            }}>
                              {contest.contest_name}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 12px',
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                backgroundColor: getStatusColor(contest.status) === 'success' ? '#dcfce7' :
                                                getStatusColor(contest.status) === 'warning' ? '#fef3c7' :
                                                getStatusColor(contest.status) === 'info' ? '#dbeafe' : '#f3f4f6',
                                color: getStatusColor(contest.status) === 'success' ? '#166534' :
                                       getStatusColor(contest.status) === 'warning' ? '#92400e' :
                                       getStatusColor(contest.status) === 'info' ? '#1e40af' : '#374151'
                              }}>
                                {contest.status.replace('_', ' ')}
                              </span>
                              <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {contest.teams_count} teams • Code: {contest.registration_code}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {contest.status === 'not_started' && (
                              <button
                                onClick={() => handleContestAction(contest, 'start')}
                                style={{
                                  padding: '8px 16px',
                                  border: '2px solid #22c55e',
                                  backgroundColor: '#22c55e',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  transition: 'all 0.2s ease',
                                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#16a34a';
                                  e.currentTarget.style.borderColor = '#16a34a';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#22c55e';
                                  e.currentTarget.style.borderColor = '#22c55e';
                                }}
                              >
                                <MdPlayArrow style={{ fontSize: '16px' }} />
                                Force Start
                              </button>
                            )}
                            
                            {contest.status === 'running' && (
                              <>
                                <button
                                  onClick={() => handleContestAction(contest, 'freeze')}
                                  style={{
                                    padding: '8px 16px',
                                    border: '2px solid #f59e0b',
                                    backgroundColor: '#ffffff',
                                    color: '#f59e0b',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s ease',
                                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fffbeb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                  }}
                                >
                                  <MdPause style={{ fontSize: '16px' }} />
                                  Freeze
                                </button>
                                <button
                                  onClick={() => handleContestAction(contest, 'end')}
                                  style={{
                                    padding: '8px 16px',
                                    border: '2px solid #ef4444',
                                    backgroundColor: '#ffffff',
                                    color: '#ef4444',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s ease',
                                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                  }}
                                >
                                  <MdStop style={{ fontSize: '16px' }} />
                                  End
                                </button>
                              </>
                            )}
                            
                            {contest.status === 'frozen' && (
                              <button
                                onClick={() => handleContestAction(contest, 'end')}
                                style={{
                                  padding: '8px 16px',
                                  border: '2px solid #ef4444',
                                  backgroundColor: '#ffffff',
                                  color: '#ef4444',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  transition: 'all 0.2s ease',
                                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fef2f2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                              >
                                <MdStop style={{ fontSize: '16px' }} />
                                End
                              </button>
                            )}

                            <button
                              onClick={() => handleContestAction(contest, 'emergency_stop')}
                              title="Emergency Stop"
                              style={{
                                padding: '8px 12px',
                                border: '2px solid #ef4444',
                                backgroundColor: '#ffffff',
                                color: '#ef4444',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease',
                                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                              }}
                            >
                              <MdWarning style={{ fontSize: '16px' }} />
                            </button>
                          </div>
                        </div>

                        {contest.status === 'running' && (
                          <div style={{ marginTop: '16px' }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                Contest Progress
                              </span>
                              <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {Math.floor(contest.time_remaining_seconds / 60)}m remaining
                              </span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '6px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${contest.progress_percentage}%`,
                                height: '100%',
                                backgroundColor: '#22c55e',
                                borderRadius: '6px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)'
          }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: '#1f2937',
                  margin: 0
                }}>
                  System Monitor
                </h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: getSystemHealthColor() === 'success' ? '#dcfce7' :
                                  getSystemHealthColor() === 'warning' ? '#fef3c7' : '#fecaca',
                  color: getSystemHealthColor() === 'success' ? '#166534' :
                         getSystemHealthColor() === 'warning' ? '#92400e' : '#dc2626'
                }}>
                  {getSystemHealthColor() === 'success' ? 'Healthy' : 
                   getSystemHealthColor() === 'warning' ? 'Warning' : 'Critical'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0'
                }}>
                  <div style={{
                    color: systemStatus.judge_queue.pending > 20 ? '#dc2626' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}>
                    <MdTimer />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      Judge Queue
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {systemStatus.judge_queue.pending} pending, {systemStatus.judge_queue.workers_active} workers
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0'
                }}>
                  <div style={{
                    color: systemStatus.database.status === 'connected' ? '#16a34a' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}>
                    <MdStorage />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      Database
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {systemStatus.database.status} ({systemStatus.database.response_time}ms)
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '12px 0'
                }}>
                  <div style={{
                    color: systemStatus.server.memory_usage > 80 ? '#f59e0b' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px',
                    marginTop: '2px'
                  }}>
                    <MdBarChart />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      marginBottom: '6px'
                    }}>
                      Server Resources
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '6px'
                    }}>
                      CPU: {systemStatus.server.cpu_usage}% | RAM: {systemStatus.server.memory_usage}%
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.max(systemStatus.server.cpu_usage, systemStatus.server.memory_usage)}%`,
                        height: '100%',
                        backgroundColor: systemStatus.server.cpu_usage > 80 || systemStatus.server.memory_usage > 80 ? '#f59e0b' : '#16a34a',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0'
                }}>
                  <div style={{
                    color: systemStatus.contests_scheduler.status === 'running' ? '#16a34a' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}>
                    <MdSchedule />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      Contest Scheduler
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {systemStatus.contests_scheduler.status} ({systemStatus.contests_scheduler.scheduled_tasks} tasks)
                    </div>
                  </div>
                </div>

                <div style={{
                  height: '1px',
                  backgroundColor: '#e5e7eb',
                  margin: '12px 0'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0'
                }}>
                  <div style={{
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}>
                    <MdTimer />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      System Uptime
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {formatUptime(systemStatus.server.uptime)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '24px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={fetchSystemStatus}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
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
                  <MdRefresh style={{ fontSize: '14px' }} />
                  Refresh Status
                </button>
                <button
                  disabled
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: '#f9fafb',
                    color: '#9ca3af',
                    borderRadius: '8px',
                    cursor: 'not-allowed',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <MdSettings style={{ fontSize: '14px' }} />
                  System Config
                </button>
              </div>
          </div>
        </div>
      </div>

      {controlDialog.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '24px 32px 16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0
              }}>
                Confirm Contest Action
              </h2>
            </div>
            <div style={{
              padding: '24px 32px'
            }}>
          {selectedContest && controlDialog.action && (
            <div>
              <div style={{
                backgroundColor: controlDialog.action === 'emergency_stop' ? '#fef2f2' :
                               controlDialog.action === 'start' ? '#dcfce7' : '#fffbeb',
                color: controlDialog.action === 'emergency_stop' ? '#dc2626' :
                       controlDialog.action === 'start' ? '#166534' : '#92400e',
                border: `1px solid ${controlDialog.action === 'emergency_stop' ? '#fecaca' :
                                     controlDialog.action === 'start' ? '#bbf7d0' : '#fed7aa'}`,
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.95rem',
                fontWeight: 500
              }}>
              {controlDialog.action === 'start' && (
                selectedContest.duration
                  ? 'This will force the contest to start immediately (ignoring the scheduled start time) and allow team submissions. The contest will run for the configured duration from now.'
                  : 'This will force the contest to start immediately under manual timing control. Remember to end the contest manually when finished.'
              )}
                {controlDialog.action === 'freeze' && 'This will freeze the leaderboard. Teams can still submit but rankings will be hidden.'}
                {controlDialog.action === 'end' && 'This will end the contest immediately and stop accepting submissions.'}
                {controlDialog.action === 'emergency_stop' && 'This will immediately stop the contest and all related processes. Use only in emergencies.'}
              </div>
              
              <div style={{
                fontSize: '1rem',
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: '8px'
              }}>
                <strong>Contest:</strong> {selectedContest.contest_name}
              </div>
              <div style={{
                fontSize: '1rem',
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: '8px'
              }}>
                <strong>Current Status:</strong> {selectedContest.status.replace('_', ' ')}
              </div>
              <div style={{
                fontSize: '1rem',
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: '12px'
              }}>
                <strong>Registered Teams:</strong> {selectedContest.teams_count}
              </div>
              
              {controlDialog.action === 'start' && (
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginTop: '16px',
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong>Before starting:</strong>
                  <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
                    <li>Ensure all problems have test cases configured</li>
                    <li>
                      The contest will start NOW
                      {selectedContest.duration
                        ? ` and run for approximately ${selectedContest.duration} minutes`
                        : ' with manual timing control'}
                    </li>
                    {selectedContest.start_time && (
                      <li>Original schedule: {new Date(selectedContest.start_time).toLocaleString()}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
            </div>
            <div style={{
              padding: '16px 32px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setControlDialog({ open: false, action: null })}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
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
                Cancel
              </button>
              <button
                onClick={executeContestAction}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  border: `2px solid ${
                    controlDialog.action === 'emergency_stop' ? '#ef4444' :
                    controlDialog.action === 'start' ? '#22c55e' : '#f59e0b'
                  }`,
                  backgroundColor: controlDialog.action === 'emergency_stop' ? '#ef4444' :
                                  controlDialog.action === 'start' ? '#22c55e' : '#f59e0b',
                  color: '#ffffff',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    const darkerColor = controlDialog.action === 'emergency_stop' ? '#dc2626' :
                                       controlDialog.action === 'start' ? '#16a34a' : '#d97706';
                    e.currentTarget.style.backgroundColor = darkerColor;
                    e.currentTarget.style.borderColor = darkerColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    const originalColor = controlDialog.action === 'emergency_stop' ? '#ef4444' :
                                         controlDialog.action === 'start' ? '#22c55e' : '#f59e0b';
                    e.currentTarget.style.backgroundColor = originalColor;
                    e.currentTarget.style.borderColor = originalColor;
                  }
                }}
              >
                {loading ? 'Processing...' :
                  controlDialog.action === 'start' ? 'Confirm Force Start' :
                  `Confirm ${controlDialog.action?.replace('_', ' ')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestControlPanel;
