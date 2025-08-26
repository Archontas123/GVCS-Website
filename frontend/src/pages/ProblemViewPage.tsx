import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CodeEditor from '../components/CodeEditor';
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
  
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    submissionId?: number;
    message?: string;
  } | null>(null); 



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
    navigate('/dashboard');
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
      
      if (response.success) {
        setSubmissionResult({
          success: true,
          submissionId: response.data.submissionId,
          message: 'Your solution has been queued for evaluation. You can view the results in your dashboard.'
        });
        setShowSubmissionModal(true);
      } else {
        setSubmissionResult({
          success: false,
          message: response.message || 'Failed to submit solution'
        });
        setShowSubmissionModal(true);
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err.response?.data?.message || err.message || 'An error occurred while submitting your solution'
      });
      setShowSubmissionModal(true);
    }
  };


  const handleTest = async (testCode: string, testLanguage: string, input: string) => {
    try {
      const response = await apiService.testCode(testLanguage, testCode, input);
      
      if (response.success) {
        const result = response.data;
        alert(`Test completed!\nVerdict: ${result.verdict}\nOutput: ${result.output}\nExecution time: ${result.executionTime}ms`);
      } else {
        alert('Test failed: ' + response.message);
      }
    } catch (err: any) {
      alert('Error testing code: ' + (err.response?.data?.message || err.message));
    }
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
        minHeight: '400px',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
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


  if (error || !problem) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      }}>
        <div style={{
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          <h2 style={{ 
            color: '#dc2626', 
            marginBottom: '16px',
            fontSize: '1.5rem',
            fontWeight: 600,
          }}>
            Problem Not Found
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {error || 'The requested problem could not be found.'}
          </p>
          <button
            onClick={handleBack}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


  const difficultyStyle = getDifficultyColor(problem.difficulty);

  
  const renderSubmissionModal = () => {
    if (!showSubmissionModal || !submissionResult) return null;

    return (
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
        zIndex: 1000,
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: submissionResult.success ? '#dcfce7' : '#fef2f2',
              marginRight: '16px',
            }}>
              <span style={{
                fontSize: '24px',
                color: submissionResult.success ? '#16a34a' : '#dc2626',
              }}>
                {submissionResult.success ? '✓' : '✗'}
              </span>
            </div>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
              }}>
                {submissionResult.success ? 'Submission Successful!' : 'Submission Failed'}
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                margin: '4px 0 0 0',
              }}>
                {submissionResult.success 
                  ? 'Your solution has been submitted for evaluation' 
                  : 'There was an issue with your submission'
                }
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            {submissionResult.success && submissionResult.submissionId && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Submission ID:</span>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    backgroundColor: '#e5e7eb',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}>
                    #{submissionResult.submissionId}
                  </span>
                </div>
              </div>
            )}
            
            {submissionResult.message && (
              <div style={{
                backgroundColor: submissionResult.success ? '#f0f9ff' : '#fef2f2',
                border: `1px solid ${submissionResult.success ? '#bae6fd' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '12px',
                color: submissionResult.success ? '#0369a1' : '#dc2626',
                fontSize: '0.9rem',
              }}>
                {submissionResult.message}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
            <button
              onClick={() => setShowSubmissionModal(false)}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              Close
            </button>
            
            {submissionResult.success && (
              <button
                onClick={() => {
                  setShowSubmissionModal(false);
                  navigate('/dashboard');
                }}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                View Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'sticky', 
        top: 0,
        zIndex: 100, 
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
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1f2937',
              margin: 0,
            }}>
              Problem {problem.problemLetter || problem.letter}: {problem.title}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span style={{
                backgroundColor: difficultyStyle.bg,
                color: difficultyStyle.color,
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {problem.difficulty}
              </span>
              
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {problem.timeLimit}ms / {problem.memoryLimit}MB
              </span>
            </div>
          </div>
        </div>

        {!isDesktop && (
        <div style={{ 
          display: 'flex', 
          gap: '8px',
        }}>
          <button
            onClick={() => setActiveTab('problem')}
            style={{
              background: activeTab === 'problem' ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'problem' ? 'white' : '#6b7280',
              border: activeTab === 'problem' ? 'none' : '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Problem
          </button>
          
          <button
            onClick={() => setActiveTab('editor')}
            style={{
              background: activeTab === 'editor' ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'editor' ? 'white' : '#6b7280',
              border: activeTab === 'editor' ? 'none' : '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
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
          borderRight: isDesktop ? '1px solid #e2e8f0' : 'none', 
          backgroundColor: '#ffffff',
        }}>
          <div style={{
            padding: '24px',
            overflowY: 'auto', 
            flex: 1, 
          }}>

            <div
              style={{
                fontSize: '1rem',
                lineHeight: '1.7', 
                color: '#374151',
                maxWidth: '100%',
              }}
              dangerouslySetInnerHTML={{
                __html: processMarkdown(problem.description)
              }}
            />
            
            {!isDesktop && (
              <div style={{ 
                position: 'sticky', 
                bottom: '20px',
                textAlign: 'center',
                marginTop: '32px'
              }}>
                <button
                  onClick={handleGoToEditor}
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 28px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                  }}
                >
                  Start Coding →
                </button>
              </div>
            )}
          </div>
        </div>


        <div style={{
          width: isDesktop ? '50%' : '100%', 
          display: (isDesktop || activeTab === 'editor') ? 'flex' : 'none', 
          flexDirection: 'column',
          backgroundColor: '#fafafa', 
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
            }}>
              Code Editor
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              margin: '4px 0 0 0',
            }}>
              Write your solution below and test it before submitting
            </p>
          </div>
          

          <div style={{ flex: 1, minHeight: '400px' }}>
            <CodeEditor
              problemId={problemId ? parseInt(problemId) : undefined} 
              onSubmit={handleSubmit} 
              onTest={handleTest} 
              onChange={(newCode) => setCode(newCode)} 
              onLanguageChange={(newLanguage) => setLanguage(newLanguage)}
              height="100%" 
            />
          </div>
        </div>
      </div>
      
      {renderSubmissionModal()}
    </div>
  );
};

export default ProblemViewPage;