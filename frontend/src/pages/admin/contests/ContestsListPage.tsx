/**
 * Hack The Valley - Manage Contests
 * Contest management interface with retro styling
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';

interface Contest {
  id: number;
  contest_name: string;
  description: string;
  start_time?: string | null;
  duration?: number | null;
  manual_control?: boolean;
  status: 'pending_manual' | 'not_started' | 'running' | 'frozen' | 'ended';
  is_active: boolean;
  registration_code: string;
  problems_count?: number;
  teams_count?: number;
}

const ContestsListPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();

  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getAdminContests();
      if (result.success && result.data) {
        setContests(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch contests');
      }
    } catch (error) {
      console.error('Failed to fetch contests:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = () => {
    navigate('/admin/contests/new');
  };

  const handleManageProblems = () => {
    navigate('/admin/problems');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#28a745';
      case 'frozen': return '#ffc107';
      case 'ended': return '#6c757d';
      default: return '#007bff';
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

  const EmptyState: React.FC<{ type: 'contests', onCreate: () => void }> = ({ type, onCreate }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        textAlign: 'center',
        padding: '48px 24px',
      }}
    >
      <p
        style={{
          fontSize: '0.9rem',
          color: '#212529',
          marginBottom: '32px',
          fontFamily: "'Press Start 2P', cursive",
          lineHeight: '1.6',
        }}
      >
        No {type} created yet
      </p>
      <button
        onClick={onCreate}
        style={{
          position: 'relative',
          border: '4px solid #212529',
          backgroundColor: '#2D58A6',
          color: 'white',
          transition: 'all 0.15s ease-in-out',
          boxShadow: '6px 6px 0px #212529',
          textShadow: '2px 2px 0px #212529',
          fontSize: '1rem',
          padding: '20px 32px',
          cursor: 'pointer',
          fontFamily: "'Press Start 2P', cursive",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(2px, 2px)';
          e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
          e.currentTarget.style.backgroundColor = '#3B6BBD';
          e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)';
          e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
          e.currentTarget.style.backgroundColor = '#2D58A6';
          e.currentTarget.style.filter = 'brightness(1)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translate(6px, 6px)';
          e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translate(2px, 2px)';
          e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
        }}
      >
        + Create Contest
      </button>
    </div>
  );

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

  if (error) {
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
              Error: {error}
            </div>
            <button
              onClick={fetchContests}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1rem',
                padding: '16px 24px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Retry
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '4px 4px 0px #212529',
            }}>
              Hack The Valley
            </h1>

            <h2 style={{
              fontSize: 'clamp(0.8rem, 2vw, 1rem)',
              fontWeight: 'bold',
              color: '#FFD700',
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0px #212529',
            }}>
              Manage Contests
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#ffffff',
                  color: '#212529',
                  boxShadow: '4px 4px 0px #212529',
                  fontSize: '0.75rem',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => navigate('/admin/contests')}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#2D58A6',
                  color: 'white',
                  boxShadow: '4px 4px 0px #212529',
                  textShadow: '2px 2px 0px #212529',
                  fontSize: '0.75rem',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                }}
              >
                Contests
              </button>
              <button
                onClick={handleManageProblems}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#ffffff',
                  color: '#212529',
                  boxShadow: '4px 4px 0px #212529',
                  fontSize: '0.75rem',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Problems
              </button>
            </div>

            <button
              onClick={handleCreateContest}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '0.75rem',
                padding: '12px 20px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(2px, 2px)';
                e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                e.currentTarget.style.backgroundColor = '#3B6BBD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                e.currentTarget.style.backgroundColor = '#2D58A6';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translate(6px, 6px)';
                e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translate(2px, 2px)';
                e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
              }}
            >
              + New Contest
            </button>
          </div>

          {/* Main Content */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '8px 8px 0px #212529',
              minHeight: '400px',
            }}
          >
            {contests.length === 0 ? (
              <EmptyState type="contests" onCreate={handleCreateContest} />
            ) : (
              <div style={{ padding: '32px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {contests.map((contest) => (
                    <div
                      key={contest.id}
                      onClick={() => navigate(`/admin/contests/${contest.id}`)}
                      style={{
                        padding: '20px',
                        border: '4px solid #212529',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                        e.currentTarget.style.transform = 'translate(-2px, -2px)';
                        e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'translate(0, 0)';
                        e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                      }}
                    >
                      <div>
                        {/* Contest Header */}
                        <div style={{ marginBottom: '16px' }}>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            color: '#212529',
                            fontFamily: "'Press Start 2P', cursive",
                          }}>
                            {contest.contest_name}
                          </h3>
                          <span
                            style={{
                              backgroundColor: getStatusColor(contest.status) + '40',
                              color: getStatusColor(contest.status),
                              padding: '4px 8px',
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              border: '2px solid ' + getStatusColor(contest.status),
                              fontFamily: "'Press Start 2P', cursive",
                              display: 'inline-block',
                            }}
                          >
                            {getStatusText(contest.status)}
                          </span>
                        </div>

                        {/* Description */}
                        <div
                          style={{
                            color: '#374151',
                            fontSize: '0.7rem',
                            marginBottom: '16px',
                            lineHeight: '1.6',
                            maxHeight: '80px',
                            overflow: 'hidden',
                            fontFamily: "'Press Start 2P', cursive",
                          }}
                        >
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                              strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
                              em: ({ children }) => <em>{children}</em>,
                            }}
                          >
                            {contest.description || 'No description'}
                          </ReactMarkdown>
                        </div>

                        {/* Contest Stats */}
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: '1.8', marginBottom: '16px' }}>
                          <div>
                            Start: {contest.start_time ? new Date(contest.start_time).toLocaleDateString() : 'Manual start'}
                          </div>
                          <div>Duration: {contest.duration ? `${contest.duration} min` : 'Manual'}</div>
                          <div>
                            Code:{' '}
                            <span style={{
                              color: '#2D58A6',
                              fontWeight: 'bold',
                              backgroundColor: '#e0e7ff',
                              padding: '2px 4px',
                            }}>
                              {contest.registration_code}
                            </span>
                          </div>
                          <div>Teams: {contest.teams_count || 0} | Problems: {contest.problems_count || 0}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {['not_started', 'pending_manual'].includes(contest.status) && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const plannedDurationText = contest.duration ? ` and run for approximately ${contest.duration} minutes` : '';
                                const scheduleText = contest.start_time ? `\n\nOriginal schedule: ${new Date(contest.start_time).toLocaleString()}` : '';
                                if (window.confirm(`Force start "${contest.contest_name}"?\n\nThis will start the contest NOW${plannedDurationText}.${scheduleText}`)) {
                                  try {
                                    const response = await fetch(`/api/admin/contests/${contest.id}/start`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
                                        'Content-Type': 'application/json'
                                      }
                                    });
                                    if (response.ok) {
                                      await fetchContests();
                                    } else {
                                      const result = await response.json();
                                      alert(`Failed to start contest: ${result.message || 'Unknown error'}`);
                                    }
                                  } catch (error) {
                                    alert('Error starting contest: ' + (error instanceof Error ? error.message : 'Unknown error'));
                                  }
                                }
                              }}
                              style={{
                                border: '3px solid #16a34a',
                                backgroundColor: '#22c55e',
                                color: 'white',
                                boxShadow: '3px 3px 0px #212529',
                                textShadow: '1px 1px 0px #212529',
                                padding: '8px 12px',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', cursive",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#16a34a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#22c55e';
                              }}
                            >
                              ▶ Force Start
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/contests/${contest.id}`);
                            }}
                            style={{
                              border: '3px solid #212529',
                              backgroundColor: '#ffffff',
                              color: '#212529',
                              boxShadow: '3px 3px 0px #212529',
                              padding: '8px 12px',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              fontFamily: "'Press Start 2P', cursive",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e5e7eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/contests/${contest.id}`);
                            }}
                            style={{
                              border: '3px solid #212529',
                              backgroundColor: '#2D58A6',
                              color: 'white',
                              boxShadow: '3px 3px 0px #212529',
                              textShadow: '1px 1px 0px #212529',
                              padding: '8px 12px',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              fontFamily: "'Press Start 2P', cursive",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3B6BBD';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#2D58A6';
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <p style={{
              fontSize: '0.6rem',
              color: '#212529',
              lineHeight: '1.6',
            }}>
              Return to{' '}
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2D58A6',
                  padding: '0',
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: "'Press Start 2P', cursive",
                }}
              >
                Team Portal
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContestsListPage;
