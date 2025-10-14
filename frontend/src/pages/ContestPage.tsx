import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import RealTimeSubmissions from '../components/RealTimeSubmissions/RealTimeSubmissions';
import { useAuth } from '../hooks/useAuth';

interface ContestProblem extends Problem {
  sample_test_cases: Array<{
    input_parameters: any;
    expected_return: any;
    test_case_name: string;
    explanation: string;
  }>;
}

const ContestPage: React.FC = () => {
  const { contestSlug } = useParams<{ contestSlug: string }>();
  const navigate = useNavigate();
  const { team } = useAuth();

  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contestName, setContestName] = useState<string>('');
  const [contestId, setContestId] = useState<number | null>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);

  useEffect(() => {
    if (contestSlug) {
      fetchContestProblems(contestSlug);
    }
  }, [contestSlug]);

  const fetchContestProblems = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContestProblemsBySlug(slug);
      if (response.success) {
        setProblems(response.data);
        if (response.data.length > 0) {
          const firstProblem = response.data[0] as any;
          setContestId(firstProblem.contestId ?? firstProblem.contest_id ?? null);
          setContestName(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        } else {
          setContestId(null);
        }
      } else {
        setError('Contest problems not found or not accessible');
        setContestId(null);
      }
    } catch (err: any) {
      console.error('Failed to load contest problems:', err);
      setError(err.response?.data?.message || 'Failed to load contest problems');
      setContestId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProblemClick = (problem: ContestProblem) => {
    navigate(`/problem/${problem.id}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: '#CECDE2',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid transparent',
            borderTop: '4px solid #212529',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{
            color: '#212529',
            fontSize: '0.7rem',
            textShadow: '2px 2px 0px rgba(255, 255, 255, 0.5)',
          }}>Loading contest...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div style={{
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: '#CECDE2',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '4px solid #212529',
            boxShadow: '8px 8px 0px #212529',
            maxWidth: '600px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
          }}>
            <h2 style={{
              color: '#dc2626',
              fontSize: 'clamp(1rem, 3vw, 1.5rem)',
              marginBottom: '20px',
              textShadow: '2px 2px 0px rgba(220, 38, 38, 0.2)',
            }}>
              Contest Not Found
            </h2>
            <p style={{
              color: '#212529',
              fontSize: '0.7rem',
              marginBottom: '32px',
              lineHeight: '1.8',
            }}>
              {error}
            </p>
            <button
              onClick={handleBackToDashboard}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '0.75rem',
                padding: '14px 28px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                transition: 'all 0.15s ease-in-out',
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
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .problem-card-hover {
          transition: all 0.15s ease-in-out;
        }

        .problem-card-hover:hover {
          transform: translate(2px, 2px);
          box-shadow: 4px 4px 0px #212529 !important;
        }

        .problem-card-hover:active {
          transform: translate(6px, 6px);
          box-shadow: 0px 0px 0px #212529 !important;
        }
      `}</style>

      <div style={{
        fontFamily: "'Press Start 2P', cursive",
        backgroundColor: '#CECDE2',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        minHeight: '100vh',
      }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#2D58A6',
          border: '4px solid #212529',
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          padding: '2rem 0',
          marginBottom: '2rem',
          boxShadow: '0 4px 0px #212529',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <h1 style={{
                  margin: 0,
                  color: 'white',
                  fontSize: 'clamp(1.2rem, 3vw, 2rem)',
                  textShadow: '4px 4px 0px #212529',
                  letterSpacing: '0.05em',
                }}>
                  {contestName}
                </h1>
                <p style={{
                  margin: '1rem 0 0 0',
                  color: 'white',
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                  textShadow: '2px 2px 0px #212529',
                }}>
                  {problems.length} problem{problems.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => navigate('/leaderboard')}
                  style={{
                    border: '4px solid #212529',
                    backgroundColor: 'white',
                    color: '#212529',
                    boxShadow: '4px 4px 0px #212529',
                    fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
                    padding: '1rem 1.5rem',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', cursive",
                    transition: 'all 0.15s ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
                    e.currentTarget.style.backgroundColor = '#FFF4CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Leaderboard
                </button>
                <button
                  onClick={handleBackToDashboard}
                  style={{
                    border: '4px solid #212529',
                    backgroundColor: 'white',
                    color: '#212529',
                    boxShadow: '4px 4px 0px #212529',
                    fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
                    padding: '1rem 1.5rem',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', cursive",
                    transition: 'all 0.15s ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ paddingBottom: '3rem' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
          }}>
            {problems.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                border: '4px solid #212529',
                boxShadow: '8px 8px 0px #212529',
                padding: '4rem 2rem',
                textAlign: 'center',
                animation: 'slideUp 0.5s ease-out',
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#212529',
                  fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                }}>
                  No Problems Available Yet
                </h3>
                <p style={{
                  margin: 0,
                  color: '#6b7280',
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                  lineHeight: '1.8',
                }}>
                  The contest organizer hasn't added any problems to this contest yet.
                </p>
              </div>
            ) : (
              <>
                {/* Problems Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
                  gap: '2rem',
                  marginBottom: '3rem',
                }}>
                  {problems.map((problem, index) => (
                    <div
                      key={problem.id}
                      className="problem-card-hover"
                      onClick={() => handleProblemClick(problem)}
                      style={{
                        background: 'white',
                        border: '4px solid #212529',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        boxShadow: '6px 6px 0px #212529',
                        animation: `slideUp 0.3s ease-out ${index * 0.05}s backwards`,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                      }}>
                        <span style={{
                          background: '#2D58A6',
                          color: 'white',
                          border: '3px solid #212529',
                          width: '45px',
                          height: '45px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          textShadow: '2px 2px 0px #212529',
                          boxShadow: '3px 3px 0px #212529',
                          fontWeight: 'bold',
                        }}>
                          {problem.problemLetter}
                        </span>

                        <span style={{
                          padding: '0.5rem 0.75rem',
                          border: '3px solid #212529',
                          fontSize: '0.55rem',
                          textTransform: 'uppercase',
                          boxShadow: '3px 3px 0px #212529',
                          fontWeight: 'bold',
                          backgroundColor: problem.difficulty === 'easy' ? '#D4F1D4' :
                                        problem.difficulty === 'medium' ? '#FFF4CC' : '#FFCCCC',
                          color: problem.difficulty === 'easy' ? '#065f46' :
                                problem.difficulty === 'medium' ? '#92400e' : '#991b1b',
                        }}>
                          {problem.difficulty}
                        </span>
                      </div>

                      <h3 style={{
                        margin: '0 0 1rem 0',
                        color: '#212529',
                        fontSize: 'clamp(0.75rem, 2vw, 0.95rem)',
                        lineHeight: '1.5',
                        fontWeight: 'bold',
                      }}>
                        {problem.title}
                      </h3>

                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '1rem',
                        fontSize: '0.6rem',
                        color: '#6b7280',
                        flexWrap: 'wrap',
                      }}>
                        <span>⏱️ {problem.timeLimit}ms</span>
                      </div>

                      <div style={{
                        color: '#4b5563',
                        lineHeight: '1.6',
                        marginBottom: '1rem',
                        fontSize: '0.6rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {problem.description && problem.description.length > 150
                          ? `${problem.description.substring(0, 150)}...`
                          : problem.description
                        }
                      </div>

                      {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                        <div style={{
                          fontSize: '0.55rem',
                          color: '#2D58A6',
                          padding: '0.5rem',
                          background: '#E8F0FE',
                          border: '2px solid #2D58A6',
                          display: 'inline-block',
                          fontWeight: 'bold',
                        }}>
                          📝 {problem.sampleTestCases.length} sample test case{problem.sampleTestCases.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submissions Section */}
                {contestId && (
                  <div style={{
                    backgroundColor: 'white',
                    border: '4px solid #212529',
                    boxShadow: '8px 8px 0px #212529',
                    padding: '2rem',
                    animation: 'slideUp 0.5s ease-out 0.2s backwards',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.5rem',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '3px solid #212529',
                    }}>
                      <div>
                        <h2 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)',
                          color: '#212529',
                          fontWeight: 'bold',
                        }}>
                          Your Contest Submissions
                        </h2>
                        <p style={{
                          margin: 0,
                          fontSize: '0.6rem',
                          color: '#6b7280',
                          lineHeight: '1.6',
                        }}>
                          Track your latest runs without leaving the contest.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSubmissions(!showSubmissions)}
                        style={{
                          border: '3px solid #212529',
                          backgroundColor: showSubmissions ? '#2D58A6' : 'white',
                          color: showSubmissions ? 'white' : '#212529',
                          boxShadow: '3px 3px 0px #212529',
                          textShadow: showSubmissions ? '1px 1px 0px #212529' : 'none',
                          fontSize: '0.6rem',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          fontFamily: "'Press Start 2P', cursive",
                          transition: 'all 0.15s ease-in-out',
                          fontWeight: 'bold',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translate(1px, 1px)';
                          e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = '3px 3px 0px #212529';
                        }}
                      >
                        {showSubmissions ? '▼ Hide' : '▶ Show'} Submissions
                      </button>
                    </div>

                    {showSubmissions && (
                      <>
                        {team ? (
                          <div style={{
                            animation: 'slideUp 0.3s ease-out',
                          }}>
                            <RealTimeSubmissions
                              contestId={contestId}
                              teamId={team.id}
                              showAllTeams={false}
                              showOnlyRecent={false}
                              showFilters={false}
                              autoScroll={false}
                              maxSubmissions={75}
                            />
                          </div>
                        ) : (
                          <div style={{
                            border: '3px dashed #9ca3af',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            background: 'rgba(249, 250, 251, 0.5)',
                            animation: 'fadeIn 0.3s ease-out',
                          }}>
                            <p style={{
                              fontSize: '0.65rem',
                              color: '#6b7280',
                              margin: 0,
                              lineHeight: '1.8',
                            }}>
                              Sign in as a team to see live submission updates for this contest.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ContestPage;
