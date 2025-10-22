import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CodeEditor from '../components/CodeEditor';
import SubmissionTracker from '../components/SubmissionTracker/SubmissionTracker';
import '../styles/theme.css';


const ProblemViewPage: React.FC = () => {
  
  const { problemId } = useParams<{ problemId: string }>(); 
  const navigate = useNavigate(); 
  const { isAuthenticated } = useAuth();
  
  const [problem, setProblem] = useState<Problem | null>(null); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 
  
  const [activeTab, setActiveTab] = useState<'problem' | 'editor'>('problem');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const [showSubmissionTracker, setShowSubmissionTracker] = useState(false);
  const [trackingSubmissionId, setTrackingSubmissionId] = useState<number | null>(null);
  const [contestSlug, setContestSlug] = useState<string | null>(null); 



  useEffect(() => {
    if (problemId) {
      fetchProblem(problemId);
    }
  }, [problemId]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const fetchProblem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getProblem(parseInt(id));
      if (response.success) {
        setProblem(response.data);

        // Try to get contest slug from team status
        try {
          const statusResponse = await apiService.getTeamStatus();
          if (statusResponse.success && statusResponse.data.team.contestSlug) {
            setContestSlug(statusResponse.data.team.contestSlug);
          }
        } catch (err) {
          console.warn('Could not fetch contest slug:', err);
        }
      } else {
        setError('Problem not found');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Problem not found');
      } else {
        setError(err.response?.data?.message || 'Failed to load problem');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    if (contestSlug) {
      navigate(`/contest/${contestSlug}`);
    } else {
      navigate('/');
    }
  };

  const handleGoToEditor = () => {
    setActiveTab('editor');
  };


  const handleSubmit = async (submitCode: string, submitLanguage: string) => {
    if (!problemId) return;

    try {
      const response = await apiService.submitSolution({
        problemId: parseInt(problemId),
        code: submitCode,
        language: submitLanguage as 'cpp' | 'java' | 'python',
      });

      if (response.success && response.data.submissionId) {
        // Show the submission tracker modal
        setTrackingSubmissionId(response.data.submissionId);
        setShowSubmissionTracker(true);
      } else {
        alert(response.message || 'Failed to submit solution');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'An error occurred while submitting your solution');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { bg: '#D4F1D4', color: '#065f46' };
      case 'medium': return { bg: '#FFF4CC', color: '#92400e' };
      case 'hard': return { bg: '#FFCCCC', color: '#991b1b' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };


  const processMarkdown = (content: string): string => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #212529;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background-color: #FFF4CC; color: #212529; padding: 2px 4px; border: 2px solid #212529; font-size: 0.85em; font-weight: 600;">$1</code>')
      .replace(/## (.*?)$/gm, '<h3 style="font-size: clamp(0.7rem, 1.8vw, 0.9rem); font-weight: 700; margin: 1.5rem 0 0.75rem; color: #212529; padding-bottom: 0.5rem; border-bottom: 3px solid #212529;">$1</h3>')
      .replace(/^- (.*?)$/gm, '<li style="margin: 0.5rem 0; padding-left: 0.5rem; color: #4b5563;">$1</li>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background-color: #212529; color: #D4F1D4; padding: 1rem; border: 3px solid #212529; overflow-x: auto; margin: 1rem 0; box-shadow: 4px 4px 0px rgba(33, 37, 41, 0.5);"><code style="font-size: 0.65rem; line-height: 1.6;">$1</code></pre>')
      .replace(/\n/g, '<br>');
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
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
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
          }}>Loading problem...</p>
        </div>
      </>
    );
  }


  if (error || !problem) {
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
              Problem Not Found
            </h2>
            <p style={{
              color: '#212529',
              fontSize: '0.7rem',
              marginBottom: '32px',
              lineHeight: '1.8',
            }}>
              {error || 'The requested problem could not be found.'}
            </p>
            <button
              onClick={handleBack}
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
              ← Back to Contest
            </button>
          </div>
        </div>
      </>
    );
  }


  const difficultyStyle = getDifficultyColor(problem.difficulty);


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
        flexDirection: 'column',
      }}>
      <div style={{
        backgroundColor: '#2D58A6',
        border: '4px solid #212529',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        padding: 'clamp(1rem, 2vw, 1.5rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'clamp(1rem, 2vw, 1.5rem)',
        boxShadow: '0 4px 0px #212529',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
          <button
            onClick={handleBack}
            style={{
              backgroundColor: 'white',
              border: '3px solid #212529',
              color: '#212529',
              cursor: 'pointer',
              fontSize: 'clamp(0.8rem, 2vw, 1rem)',
              padding: '0.5rem 0.75rem',
              boxShadow: '4px 4px 0px #212529',
              transition: 'all 0.15s ease-in-out',
              fontFamily: "'Press Start 2P', cursive",
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
            }}
          >
            ←
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 1.5vw, 0.75rem)', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#2D58A6',
                color: 'white',
                border: '3px solid #212529',
                width: 'clamp(35px, 8vw, 45px)',
                height: 'clamp(35px, 8vw, 45px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(0.7rem, 2vw, 1rem)',
                textShadow: '2px 2px 0px #212529',
                boxShadow: '3px 3px 0px #212529',
                fontWeight: 'bold',
              }}>
                {problem.problemLetter}
              </span>
              <h1 style={{
                fontSize: 'clamp(0.75rem, 2.5vw, 1.2rem)',
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                textShadow: '3px 3px 0px #212529',
              }}>
                {problem.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 1.5vw, 0.75rem)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: difficultyStyle.bg,
                color: difficultyStyle.color,
                padding: 'clamp(0.35rem, 1vw, 0.5rem) clamp(0.6rem, 1.5vw, 0.75rem)',
                border: '3px solid #212529',
                fontSize: 'clamp(0.45rem, 1.2vw, 0.55rem)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                boxShadow: '3px 3px 0px #212529',
              }}>
                {problem.difficulty}
              </span>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: 'white',
                padding: 'clamp(0.35rem, 1vw, 0.5rem) clamp(0.6rem, 1.5vw, 0.75rem)',
                border: '3px solid #212529',
                boxShadow: '3px 3px 0px #212529',
              }}>
                <span style={{ fontSize: 'clamp(0.45rem, 1.2vw, 0.55rem)', color: '#212529', fontWeight: 'bold' }}>
                  ⏱ {problem.timeLimit}ms
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isDesktop && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          width: '100%',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => setActiveTab('problem')}
            style={{
              background: activeTab === 'problem' ? 'white' : '#CECDE2',
              color: '#212529',
              border: '3px solid #212529',
              padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
              fontSize: 'clamp(0.45rem, 1.2vw, 0.6rem)',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              flex: 1,
              boxShadow: activeTab === 'problem' ? '4px 4px 0px #212529' : '3px 3px 0px #212529',
              fontFamily: "'Press Start 2P', cursive",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'problem') {
                e.currentTarget.style.transform = 'translate(1px, 1px)';
                e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'problem') {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '3px 3px 0px #212529';
              }
            }}
          >
            Problem
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            style={{
              background: activeTab === 'editor' ? 'white' : '#CECDE2',
              color: '#212529',
              border: '3px solid #212529',
              padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
              fontSize: 'clamp(0.45rem, 1.2vw, 0.6rem)',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              flex: 1,
              boxShadow: activeTab === 'editor' ? '4px 4px 0px #212529' : '3px 3px 0px #212529',
              fontFamily: "'Press Start 2P', cursive",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'editor') {
                e.currentTarget.style.transform = 'translate(1px, 1px)';
                e.currentTarget.style.boxShadow = '2px 2px 0px #212529';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'editor') {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '3px 3px 0px #212529';
              }
            }}
          >
            Editor
          </button>
        </div>
        )}
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex',
        minHeight: 0, 
      }}>
        

        <div style={{
          width: isDesktop ? '50%' : '100%',
          display: (isDesktop || activeTab === 'problem') ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: isDesktop ? '4px solid #212529' : 'none',
          backgroundColor: '#CECDE2',
        }}>
          <div style={{
            padding: 'clamp(1rem, 3vw, 2rem)',
            overflowY: 'auto',
            flex: 1,
          }}>
            <div style={{
              backgroundColor: 'white',
              border: '4px solid #212529',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              boxShadow: '6px 6px 0px #212529',
            }}>
              <div
                style={{
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                  lineHeight: '1.8',
                  color: '#212529',
                  maxWidth: '100%',
                }}
                dangerouslySetInnerHTML={{
                  __html: processMarkdown(problem.description)
                }}
              />
            </div>

            {!isDesktop && (
              <div style={{
                textAlign: 'center',
                marginTop: 'clamp(1rem, 3vw, 2rem)',
              }}>
                <button
                  onClick={handleGoToEditor}
                  style={{
                    backgroundColor: '#2D58A6',
                    color: 'white',
                    border: '3px solid #212529',
                    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
                    fontSize: 'clamp(0.55rem, 1.5vw, 0.7rem)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '6px 6px 0px #212529',
                    textShadow: '2px 2px 0px #212529',
                    transition: 'all 0.15s ease-in-out',
                    width: '100%',
                    maxWidth: '300px',
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
                >
                  Start Coding
                </button>
              </div>
            )}
          </div>
        </div>


        <div style={{
          width: isDesktop ? '50%' : '100%',
          display: (isDesktop || activeTab === 'editor') ? 'flex' : 'none',
          flexDirection: 'column',
          backgroundColor: '#CECDE2',
        }}>
          <div style={{
            padding: 'clamp(0.75rem, 2vw, 1.25rem)',
            backgroundColor: 'white',
            border: '4px solid #212529',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            boxShadow: '0 4px 0px #212529',
          }}>
            <h2 style={{
              fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)',
              fontWeight: 'bold',
              color: '#212529',
              margin: 0,
              textShadow: '2px 2px 0px rgba(33, 37, 41, 0.1)',
            }}>
              💻 Code Editor
            </h2>
            <p style={{
              fontSize: 'clamp(0.5rem, 1.2vw, 0.6rem)',
              color: '#6b7280',
              margin: '0.5rem 0 0 0',
            }}>
              Write and submit your solution
            </p>
          </div>

          <div style={{ flex: 1, minHeight: '400px' }}>
            <CodeEditor
              problemId={problemId ? parseInt(problemId) : undefined}
              onSubmit={handleSubmit}
              onChange={(newCode) => setCode(newCode)}
              onLanguageChange={(newLanguage) => setLanguage(newLanguage)}
              height="100%"
              showTestingControls={false}
            />
          </div>
        </div>
      </div>

      {showSubmissionTracker && trackingSubmissionId && (
        <SubmissionTracker
          submissionId={trackingSubmissionId}
          onClose={() => {
            setShowSubmissionTracker(false);
            setTrackingSubmissionId(null);
          }}
          autoClose={false}
        />
      )}
      </div>
    </>
  );
};

export default ProblemViewPage;