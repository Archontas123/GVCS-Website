/**
 * CS Club Hackathon Platform - Problem Preview Page (Public)
 * Allows viewing problems without authentication for contests that are open
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import '../styles/theme.css';

interface PublicProblem extends Problem {
  sample_test_cases: Array<{
    input: string;
    expected_output: string;
  }>;
}

const ProblemPreviewPage: React.FC = () => {
  const { problemId, contestId, contestSlug } = useParams<{ problemId?: string; contestId?: string; contestSlug?: string }>();
  const navigate = useNavigate();
  
  const [problem, setProblem] = useState<PublicProblem | null>(null);
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (problemId) {
      fetchSingleProblem(problemId);
    } else if (contestSlug) {
      fetchContestProblemsBySlug(contestSlug);
    } else if (contestId) {
      fetchContestProblems(contestId);
    }
  }, [problemId, contestId, contestSlug]);

  const fetchSingleProblem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getProblemPublic(parseInt(id));
      if (response.success) {
        setProblem(response.data);
      } else {
        setError('Problem not found or not accessible');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestProblems = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Check if id is a number (contest ID) or string (registration code)
      const response = isNaN(parseInt(id)) 
        ? await apiService.getContestProblemsByCode(id)
        : await apiService.getContestProblemsPublic(parseInt(id));
      
      if (response.success) {
        setProblems(response.data);
      } else {
        setError('Contest problems not found or not accessible');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contest problems');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestProblemsBySlug = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContestProblemsBySlug(slug);
      if (response.success) {
        setProblems(response.data);
      } else {
        setError('Contest problems not found or not accessible');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contest problems');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { bg: '#dcfce7', color: '#166534' };
      case 'medium': return { bg: '#fef3c7', color: '#a16207' };
      case 'hard': return { bg: '#fef2f2', color: '#dc2626' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const processMarkdown = (content: string): string => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>')
      .replace(/## (.*?)$/gm, '<h3 style="font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px; color: #1f2937;">$1</h3>')
      .replace(/^- (.*?)$/gm, '<li style="margin: 4px 0;">$1</li>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background-color: #1f2937; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0;"><code>$1</code></pre>')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #1d4ed8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        padding: '32px',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '48px 32px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: '#dc2626',
          }}>
            ⚠️
          </div>
          <h2 style={{ 
            color: '#dc2626', 
            marginBottom: '16px',
            fontSize: '1.5rem',
            fontWeight: 600,
          }}>
            Problem Not Found
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleBack}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ← Back to Home
            </button>
            <button
              onClick={handleRegister}
              style={{
                background: '#ffffff',
                color: '#1d4ed8',
                border: '2px solid #1d4ed8',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#1d4ed8';
              }}
            >
              Register to Participate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Contest problems list view
  if (contestId && !problemId && problems.length > 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        padding: '32px 16px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#1d4ed8',
              marginBottom: '16px',
            }}>
              Contest Problems Preview
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '24px' }}>
              Get a preview of the contest problems. Register to participate and submit solutions!
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBack}
                style={{
                  background: '#ffffff',
                  color: '#6b7280',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                ← Back to Home
              </button>
              <button
                onClick={handleRegister}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                }}
              >
                Register to Participate →
              </button>
            </div>
          </div>

          {/* Problems Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}>
            {problems.map((prob) => {
              const difficultyStyle = getDifficultyColor(prob.difficulty);
              return (
                <div
                  key={prob.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => navigate(`/contest/${contestSlug || contestId}/problem/${prob.id}/preview`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0,
                    }}>
                      Problem {prob.problemLetter}: {prob.title}
                    </h3>
                    <span style={{
                      backgroundColor: difficultyStyle.bg,
                      color: difficultyStyle.color,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      {prob.difficulty}
                    </span>
                  </div>
                  <p style={{
                    color: '#6b7280',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {prob.description.replace(/[#*`]/g, '').substring(0, 150)}...
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                  }}>
                    <span>{prob.timeLimit}ms / {prob.memoryLimit}MB</span>
                    <span>{prob.sample_test_cases?.length || 0} sample test cases</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Single problem view
  if (problem) {
    const difficultyStyle = getDifficultyColor(problem.difficulty);

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ←
            </button>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
              }}>
                Problem {problem.problemLetter}: {problem.title} (Preview)
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{
                  backgroundColor: difficultyStyle.bg,
                  color: difficultyStyle.color,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {problem.difficulty}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {problem.timeLimit}ms / {problem.memoryLimit}MB
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRegister}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
            }}
          >
            Register to Submit Solutions
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Problem Description */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              padding: '32px',
              marginBottom: '24px',
            }}>
              <div
                style={{
                  fontSize: '1rem',
                  lineHeight: '1.7',
                  color: '#374151',
                }}
                dangerouslySetInnerHTML={{
                  __html: processMarkdown(problem.description)
                }}
              />
            </div>

            {/* Sample Test Cases */}
            {problem.sample_test_cases && problem.sample_test_cases.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                padding: '32px',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '24px',
                }}>
                  Sample Test Cases
                </h3>
                {problem.sample_test_cases.map((testCase, index) => (
                  <div key={index} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    marginBottom: index < problem.sample_test_cases.length - 1 ? '16px' : '0',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '12px 16px',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.9rem',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      Sample {index + 1}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#4b5563',
                          marginBottom: '8px',
                        }}>
                          Input:
                        </div>
                        <pre style={{
                          backgroundColor: '#1f2937',
                          color: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {testCase.input}
                        </pre>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#4b5563',
                          marginBottom: '8px',
                        }}>
                          Output:
                        </div>
                        <pre style={{
                          backgroundColor: '#1f2937',
                          color: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {testCase.expected_output}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Call to Action */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              padding: '32px',
              textAlign: 'center',
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '16px',
              }}>
                Ready to Solve This Problem?
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '1.1rem',
                marginBottom: '24px',
                lineHeight: '1.6',
              }}>
                Register your team to participate in the contest and submit your solutions!
              </p>
              <button
                onClick={handleRegister}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 32px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25)';
                }}
              >
                Register Your Team Now →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ProblemPreviewPage;