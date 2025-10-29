import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdTimer, MdEmojiEvents, MdDescription } from 'react-icons/md';
import { Problem, Submission } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface ContestProblem extends Problem {
  sample_test_cases: Array<{
    input_parameters: any;
    expected_return: any;
    test_case_name: string;
    explanation: string;
  }>;
  maxPoints?: number;
  isSolved?: boolean;
}

interface SubmissionWithDetails extends Submission {
  problemLetter?: string;
  problemTitle?: string;
}

const ContestPage: React.FC = () => {
  const { contestSlug } = useParams<{ contestSlug: string }>();
  const navigate = useNavigate();
  const { team } = useAuth();

  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'problems' | 'submissions'>('problems');
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contestName, setContestName] = useState<string>('');
  const [contestId, setContestId] = useState<number | null>(null);

  useEffect(() => {
    if (contestSlug) {
      fetchContestProblems(contestSlug);
    }
  }, [contestSlug, team]);

  const fetchContestProblems = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContestProblemsBySlug(slug);
      if (response.success) {
        let problemsData = response.data || [];
        const firstProblem = problemsData.length > 0 ? (problemsData[0] as any) : null;
        const derivedContestId = firstProblem?.contestId ?? firstProblem?.contest_id ?? null;

        // If user is authenticated, fetch solved status from team's submissions
        if (team && team.id) {
          try {
            const submissionsResponse = await apiService.getTeamSubmissions(
              team.id,
              derivedContestId ? { contestId: derivedContestId } : undefined
            );

            if (submissionsResponse.success && submissionsResponse.data?.submissions) {
              const solvedProblemIds = new Set(
                submissionsResponse.data.submissions
                  .filter((sub: any) => {
                    const status = (sub.status || '').toString().toLowerCase();
                    return status === 'accepted' || status === 'ac';
                  })
                  .map((sub: any) => sub.problemId ?? sub.problem_id)
                  .filter((id: any) => typeof id === 'number')
              );

              // Mark problems as solved
              problemsData = problemsData.map((prob: any) => ({
                ...prob,
                isSolved: solvedProblemIds.has(prob.id)
              }));
            }
          } catch (submissionErr) {
            console.warn('Could not fetch solved status:', submissionErr);
            // Continue without solved status
          }
        }

        setProblems(problemsData);
        if (problemsData.length > 0) {
          setContestId(derivedContestId);
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

  const fetchSubmissions = async () => {
    if (!team || !contestId) return;

    setSubmissionsLoading(true);
    try {
      const response = await apiService.getTeamSubmissions(team.id, { contestId });

      if (response.success && response.data?.submissions) {
        // Enrich submissions with problem details
        const enrichedSubmissions = response.data.submissions.map((sub: any) => {
          const problem = problems.find(p => p.id === (sub.problemId ?? sub.problem_id));
          return {
            ...sub,
            id: sub.id,
            teamId: sub.teamId ?? sub.team_id,
            problemId: sub.problemId ?? sub.problem_id,
            language: sub.language,
            code: sub.code || '',
            status: sub.status,
            submissionTime: sub.submissionTime ?? sub.submission_time,
            executionTime: sub.executionTime ?? sub.execution_time,
            memoryUsed: sub.memoryUsed ?? sub.memory_used,
            judgedAt: sub.judgedAt ?? sub.judged_at,
            problemLetter: problem?.problemLetter || sub.problem_letter,
            problemTitle: problem?.title || sub.problem_title,
          };
        });

        setSubmissions(enrichedSubmissions);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions' && contestId && team) {
      fetchSubmissions();
    }
  }, [activeTab, contestId, team]);

  const handleProblemClick = (problem: ContestProblem) => {
    navigate(`/problem/${problem.id}`);
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'ac':
        return { bg: '#D4F1D4', color: '#065f46', border: '#22c55e' };
      case 'wrong_answer':
      case 'wa':
        return { bg: '#FFCCCC', color: '#991b1b', border: '#dc2626' };
      case 'time_limit_exceeded':
      case 'tle':
        return { bg: '#FFF4CC', color: '#92400e', border: '#d97706' };
      case 'memory_limit_exceeded':
      case 'mle':
        return { bg: '#FFF4CC', color: '#92400e', border: '#d97706' };
      case 'runtime_error':
      case 'rte':
        return { bg: '#fed7aa', color: '#7c2d12', border: '#ea580c' };
      case 'compilation_error':
      case 'ce':
        return { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' };
      case 'pending':
      case 'judging':
        return { bg: '#f3f4f6', color: '#374151', border: '#6b7280' };
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#6b7280' };
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'accepted': 'Accepted',
      'ac': 'Accepted',
      'wrong_answer': 'Wrong Answer',
      'wa': 'Wrong Answer',
      'time_limit_exceeded': 'Time Limit',
      'tle': 'Time Limit',
      'memory_limit_exceeded': 'Memory Limit',
      'mle': 'Memory Limit',
      'runtime_error': 'Runtime Error',
      'rte': 'Runtime Error',
      'compilation_error': 'Compile Error',
      'ce': 'Compile Error',
      'pending': 'Pending',
      'judging': 'Judging',
    };
    return statusMap[status?.toLowerCase()] || status;
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
              Back to Home
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
          transform: scale(0.98);
          box-shadow: 3px 3px 0px #212529 !important;
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
              <div style={{ flex: 1 }}>
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

                {/* Tabs */}
                {team && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '1.5rem',
                  }}>
                    <button
                      onClick={() => setActiveTab('problems')}
                      style={{
                        border: activeTab === 'problems' ? '4px solid #212529' : '3px solid rgba(255,255,255,0.3)',
                        backgroundColor: activeTab === 'problems' ? 'white' : 'rgba(255,255,255,0.1)',
                        color: activeTab === 'problems' ? '#212529' : 'white',
                        boxShadow: activeTab === 'problems' ? '4px 4px 0px #212529' : 'none',
                        fontSize: 'clamp(0.55rem, 1.5vw, 0.7rem)',
                        padding: '0.75rem 1.25rem',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      Problems
                    </button>
                    <button
                      onClick={() => setActiveTab('submissions')}
                      style={{
                        border: activeTab === 'submissions' ? '4px solid #212529' : '3px solid rgba(255,255,255,0.3)',
                        backgroundColor: activeTab === 'submissions' ? 'white' : 'rgba(255,255,255,0.1)',
                        color: activeTab === 'submissions' ? '#212529' : 'white',
                        boxShadow: activeTab === 'submissions' ? '4px 4px 0px #212529' : 'none',
                        fontSize: 'clamp(0.55rem, 1.5vw, 0.7rem)',
                        padding: '0.75rem 1.25rem',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      Submissions
                    </button>
                  </div>
                )}
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
                  ← Home
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
            {activeTab === 'problems' ? (
              problems.length === 0 ? (
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
                        background: problem.isSolved ? '#f0fdf4' : 'white',
                        border: problem.isSolved ? '4px solid #22c55e' : '4px solid #212529',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        boxShadow: '6px 6px 0px #212529',
                        animation: `slideUp 0.3s ease-out ${index * 0.05}s backwards`,
                        position: 'relative',
                      }}
                    >
                      {problem.isSolved && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: '#22c55e',
                          color: 'white',
                          border: '3px solid #212529',
                          borderRadius: '50%',
                          width: '35px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          boxShadow: '3px 3px 0px #212529',
                          zIndex: 1,
                        }}>
                          ✓
                        </div>
                      )}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                      }}>
                        <span style={{
                          background: problem.isSolved ? '#22c55e' : '#2D58A6',
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
                        flexWrap: 'wrap',
                      }}>
                        <span style={{
                          color: '#212529',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          <MdTimer size={14} /> {problem.timeLimit}ms
                        </span>
                        {problem.maxPoints !== undefined && (
                          <span style={{
                            color: '#2D58A6',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}>
                            <MdEmojiEvents size={14} /> {problem.maxPoints} points
                          </span>
                        )}
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontWeight: 'bold',
                        }}>
                          <MdDescription size={14} /> {problem.sampleTestCases.length} sample test case{problem.sampleTestCases.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              /* Submissions View */
              <div style={{
                backgroundColor: 'white',
                border: '4px solid #212529',
                boxShadow: '8px 8px 0px #212529',
                animation: 'slideUp 0.3s ease-out',
              }}>
                {!team ? (
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                  }}>
                    <h3 style={{
                      margin: '0 0 1rem 0',
                      color: '#212529',
                      fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                    }}>
                      Sign In to View Submissions
                    </h3>
                    <p style={{
                      margin: 0,
                      color: '#6b7280',
                      fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                      lineHeight: '1.8',
                    }}>
                      You need to be signed in to view your team's submissions.
                    </p>
                  </div>
                ) : submissionsLoading ? (
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid transparent',
                      borderTop: '4px solid #212529',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 20px',
                    }}></div>
                    <p style={{
                      color: '#212529',
                      fontSize: '0.7rem',
                    }}>Loading submissions...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                  }}>
                    <h3 style={{
                      margin: '0 0 1rem 0',
                      color: '#212529',
                      fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                    }}>
                      No Submissions Yet
                    </h3>
                    <p style={{
                      margin: 0,
                      color: '#6b7280',
                      fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                      lineHeight: '1.8',
                    }}>
                      You haven't submitted any solutions for this contest yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#2D58A6',
                          color: 'white',
                        }}>
                          <th style={{
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            fontWeight: 'bold',
                            borderBottom: '3px solid #212529',
                            textShadow: '2px 2px 0px #212529',
                          }}>ID</th>
                          <th style={{
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            fontWeight: 'bold',
                            borderBottom: '3px solid #212529',
                            textShadow: '2px 2px 0px #212529',
                          }}>Problem</th>
                          <th style={{
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            fontWeight: 'bold',
                            borderBottom: '3px solid #212529',
                            textShadow: '2px 2px 0px #212529',
                          }}>Language</th>
                          <th style={{
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            fontWeight: 'bold',
                            borderBottom: '3px solid #212529',
                            textShadow: '2px 2px 0px #212529',
                          }}>Status</th>
                          <th style={{
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                            fontWeight: 'bold',
                            borderBottom: '3px solid #212529',
                            textShadow: '2px 2px 0px #212529',
                          }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((submission, index) => {
                          const statusColors = getStatusColor(submission.status);
                          return (
                            <tr
                              key={submission.id}
                              style={{
                                backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#E8F0FE';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb';
                              }}
                              onClick={() => navigate(`/problem/${submission.problemId}`)}
                            >
                              <td style={{
                                padding: '1rem',
                                fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
                                color: '#6b7280',
                                borderBottom: '1px solid #e5e7eb',
                              }}>
                                #{submission.id}
                              </td>
                              <td style={{
                                padding: '1rem',
                                fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
                                borderBottom: '1px solid #e5e7eb',
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                }}>
                                  <span style={{
                                    backgroundColor: '#2D58A6',
                                    color: 'white',
                                    border: '2px solid #212529',
                                    width: '30px',
                                    height: '30px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    boxShadow: '2px 2px 0px #212529',
                                  }}>
                                    {submission.problemLetter || '?'}
                                  </span>
                                  <span style={{
                                    color: '#212529',
                                    fontWeight: 'bold',
                                  }}>
                                    {submission.problemTitle || `Problem ${submission.problemId}`}
                                  </span>
                                </div>
                              </td>
                              <td style={{
                                padding: '1rem',
                                fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
                                color: '#212529',
                                textTransform: 'uppercase',
                                fontWeight: 'bold',
                                borderBottom: '1px solid #e5e7eb',
                              }}>
                                {submission.language}
                              </td>
                              <td style={{
                                padding: '1rem',
                                borderBottom: '1px solid #e5e7eb',
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.4rem 0.8rem',
                                  border: `3px solid ${statusColors.border}`,
                                  backgroundColor: statusColors.bg,
                                  color: statusColors.color,
                                  fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  boxShadow: '2px 2px 0px #212529',
                                }}>
                                  {formatStatus(submission.status)}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem',
                                fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
                                color: '#212529',
                                borderBottom: '1px solid #e5e7eb',
                              }}>
                                {submission.executionTime !== null && submission.executionTime !== undefined
                                  ? `${submission.executionTime}ms`
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ContestPage;
