import React, { useState, useEffect } from 'react';
import submissionTrackingService, { SubmissionStatus } from '../../services/submissionTracking';

interface SubmissionTrackerProps {
  submissionId: number;
  onClose: () => void;
  autoClose?: boolean; // Auto-close when complete
}

const SubmissionTracker: React.FC<SubmissionTrackerProps> = ({
  submissionId,
  onClose,
  autoClose = false
}) => {
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start tracking submission
    const stopTracking = submissionTrackingService.trackSubmission(
      submissionId,
      (updatedStatus) => {
        setStatus(updatedStatus);
        // Animate progress based on status
        if (updatedStatus.status === 'pending') {
          setProgress(25);
        } else if (updatedStatus.status === 'judging') {
          setProgress(75);
        }
      },
      (finalStatus) => {
        setStatus(finalStatus);
        setIsComplete(true);
        setProgress(100);

        if (autoClose) {
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      }
    );

    return () => {
      stopTracking.then(stop => stop());
    };
  }, [submissionId, onClose, autoClose]);

  const getVerdictInfo = () => {
    if (!status) {
      return { icon: '...', color: '#6b7280', bg: '#f3f4f6', text: 'Loading...' };
    }

    const verdict = status.verdict || status.result || status.status;

    switch (verdict?.toLowerCase()) {
      case 'accepted':
        return { icon: 'AC', color: '#22c55e', bg: '#D4F1D4', text: 'Accepted' };
      case 'wrong_answer':
      case 'wrong answer':
        return { icon: 'WA', color: '#dc2626', bg: '#FFCCCC', text: 'Wrong Answer' };
      case 'time_limit_exceeded':
      case 'time limit exceeded':
        return { icon: 'TLE', color: '#d97706', bg: '#FFF4CC', text: 'Time Limit Exceeded' };
      case 'memory_limit_exceeded':
      case 'memory limit exceeded':
        return { icon: 'MLE', color: '#d97706', bg: '#FFF4CC', text: 'Memory Limit Exceeded' };
      case 'runtime_error':
      case 'runtime error':
        return { icon: 'RTE', color: '#7c2d12', bg: '#fed7aa', text: 'Runtime Error' };
      case 'compilation_error':
      case 'compilation error':
        return { icon: 'CE', color: '#1d4ed8', bg: '#dbeafe', text: 'Compilation Error' };
      case 'pending':
        return { icon: '...', color: '#6b7280', bg: '#f3f4f6', text: 'In Queue...' };
      case 'judging':
        return { icon: '...', color: '#1d4ed8', bg: '#dbeafe', text: 'Judging...' };
      default:
        return { icon: '?', color: '#6b7280', bg: '#f3f4f6', text: verdict || 'Unknown' };
    }
  };

  const verdictInfo = getVerdictInfo();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: ${progress}%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          fontFamily: "'Press Start 2P', cursive",
          padding: '20px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            border: '4px solid #212529',
            boxShadow: '8px 8px 0px #212529',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            maxWidth: '600px',
            width: '100%',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              borderBottom: '3px solid #212529',
              paddingBottom: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  backgroundColor: verdictInfo.bg,
                  border: '3px solid #212529',
                  width: 'clamp(45px, 12vw, 55px)',
                  height: 'clamp(45px, 12vw, 55px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '4px 4px 0px #212529',
                }}
              >
                {!isComplete && (status?.status === 'pending' || status?.status === 'judging') ? (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '3px solid transparent',
                      borderTop: '3px solid #212529',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 'clamp(0.6rem, 2vw, 0.75rem)',
                      fontWeight: 'bold',
                      color: verdictInfo.color,
                    }}
                  >
                    {verdictInfo.icon}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
                    fontWeight: 'bold',
                    color: '#212529',
                    margin: 0,
                    lineHeight: '1.4',
                  }}
                >
                  {verdictInfo.text}
                </h2>
                {status?.problemLetter && (
                  <p
                    style={{
                      fontSize: 'clamp(0.5rem, 1.5vw, 0.6rem)',
                      color: '#6b7280',
                      margin: '0.5rem 0 0 0',
                    }}
                  >
                    Problem {status.problemLetter}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {!isComplete && (
              <div
                style={{
                  width: '100%',
                  height: '20px',
                  backgroundColor: '#f3f4f6',
                  border: '3px solid #212529',
                  boxShadow: '3px 3px 0px #212529',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#2D58A6',
                    width: `${progress}%`,
                    transition: 'width 0.5s ease-in-out',
                    animation: status?.status === 'pending' || status?.status === 'judging' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '3px solid #212529',
                padding: '0.75rem',
                boxShadow: '3px 3px 0px #212529',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(0.45rem, 1.2vw, 0.5rem)',
                  color: '#6b7280',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                ID
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)',
                  fontWeight: 'bold',
                  color: '#212529',
                }}
              >
                #{status?.submissionId || '---'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '3px solid #212529',
                padding: '0.75rem',
                boxShadow: '3px 3px 0px #212529',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(0.45rem, 1.2vw, 0.5rem)',
                  color: '#6b7280',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Time
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)',
                  fontWeight: 'bold',
                  color: '#212529',
                }}
              >
                {status?.executionTime !== undefined && status?.executionTime !== null
                  ? `${status.executionTime}ms`
                  : '---'}
              </div>
            </div>

            {status?.totalTestCases !== undefined && status?.totalTestCases !== null && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '3px solid #212529',
                  padding: '0.75rem',
                  boxShadow: '3px 3px 0px #212529',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(0.45rem, 1.2vw, 0.5rem)',
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Tests
                </div>
                <div
                  style={{
                    fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)',
                    fontWeight: 'bold',
                    color: '#212529',
                  }}
                >
                  {status.testCasesPassed || 0}/{status.totalTestCases}
                </div>
              </div>
            )}

            {status?.queueInfo && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '3px solid #212529',
                  padding: '0.75rem',
                  boxShadow: '3px 3px 0px #212529',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(0.45rem, 1.2vw, 0.5rem)',
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Queue
                </div>
                <div
                  style={{
                    fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)',
                    fontWeight: 'bold',
                    color: '#212529',
                  }}
                >
                  {status.queueInfo.queueLength} jobs
                </div>
              </div>
            )}
          </div>

          {/* Queue Info Message */}
          {status?.queueInfo && !isComplete && (
            <div
              style={{
                backgroundColor: '#FFF4CC',
                border: '3px solid #212529',
                padding: '1rem',
                marginBottom: '1.5rem',
                boxShadow: '3px 3px 0px #212529',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(0.5rem, 1.3vw, 0.6rem)',
                  color: '#212529',
                  lineHeight: '1.6',
                }}
              >
                Wait time: {status.queueInfo.estimatedWaitTime}
              </div>
            </div>
          )}

          {/* Test Case Breakdown Section */}
          {isComplete && status?.judgeOutput && (
            <>
              {/* Compilation Error */}
              {status.status === 'compilation_error' && status.judgeOutput.testCases && status.judgeOutput.testCases.length > 0 && status.judgeOutput.testCases[0].error && (
                <div
                  style={{
                    backgroundColor: '#dbeafe',
                    border: '3px solid #3b82f6',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    boxShadow: '3px 3px 0px #212529',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(0.5rem, 1.3vw, 0.6rem)',
                      fontWeight: 'bold',
                      color: '#1e40af',
                      marginBottom: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    Compilation Error
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(0.45rem, 1.2vw, 0.55rem)',
                      color: '#1e40af',
                      lineHeight: '1.6',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {status.judgeOutput.testCases[0].error}
                  </div>
                </div>
              )}

              {/* Comprehensive Test Case Breakdown */}
              {status.status !== 'compilation_error' && status.judgeOutput.testCases && status.judgeOutput.testCases.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: '3px solid #212529',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    boxShadow: '3px 3px 0px #212529',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(0.5rem, 1.3vw, 0.6rem)',
                      fontWeight: 'bold',
                      color: '#212529',
                      marginBottom: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    Test Case Breakdown
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {status.judgeOutput.testCases.map((testCase: any, index: number) => {
                      const isPassed = testCase.passed || testCase.verdict === 'Accepted' || testCase.outputMatches;
                      const isSample = testCase.isSample;
                      const hasError = !!testCase.error;

                      // Determine background color based on status
                      const bgColor = isPassed ? '#d1fae5' : (hasError ? '#fee2e2' : '#fed7aa');
                      const borderColor = isPassed ? '#10b981' : (hasError ? '#ef4444' : '#ea580c');
                      const textColor = isPassed ? '#065f46' : (hasError ? '#7f1d1d' : '#7c2d12');

                      return (
                        <div
                          key={index}
                          style={{
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            padding: '0.75rem',
                            borderRadius: '4px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: hasError || (!isPassed && !isSample) ? '0.5rem' : '0',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 'clamp(0.45rem, 1.2vw, 0.55rem)',
                                fontWeight: 'bold',
                                color: textColor,
                              }}
                            >
                              {testCase.testCase || `Test Case #${index + 1}`}
                              {isSample && ' (Sample)'}
                            </div>
                            <div
                              style={{
                                fontSize: 'clamp(0.4rem, 1.1vw, 0.5rem)',
                                fontWeight: 'bold',
                                color: textColor,
                                padding: '0.25rem 0.5rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '3px',
                              }}
                            >
                              {isPassed ? '✓ PASSED' : '✗ FAILED'}
                            </div>
                          </div>

                          {/* Show error message if present */}
                          {hasError && (
                            <div
                              style={{
                                fontSize: 'clamp(0.4rem, 1.1vw, 0.5rem)',
                                color: textColor,
                                lineHeight: '1.5',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                padding: '0.5rem',
                                borderRadius: '3px',
                                marginTop: '0.5rem',
                              }}
                            >
                              <strong>Error:</strong> {testCase.error}
                            </div>
                          )}

                          {/* Show input/output for sample test cases OR if there's an error in hidden test cases */}
                          {!isPassed && (isSample || hasError) && !hasError && (
                            <div
                              style={{
                                fontSize: 'clamp(0.4rem, 1.1vw, 0.5rem)',
                                color: textColor,
                                lineHeight: '1.5',
                                fontFamily: 'monospace',
                                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                padding: '0.5rem',
                                borderRadius: '3px',
                                marginTop: '0.5rem',
                              }}
                            >
                              <div><strong>Expected:</strong> {testCase.expectedOutput || testCase.expected_output || 'N/A'}</div>
                              <div style={{ marginTop: '0.25rem' }}><strong>Got:</strong> {testCase.output || 'N/A'}</div>
                            </div>
                          )}

                          {/* For hidden test cases that failed without error, just show the verdict */}
                          {!isPassed && !isSample && !hasError && (
                            <div
                              style={{
                                fontSize: 'clamp(0.4rem, 1.1vw, 0.5rem)',
                                color: textColor,
                                lineHeight: '1.5',
                                fontStyle: 'italic',
                                marginTop: '0.5rem',
                              }}
                            >
                              Hidden test case - {testCase.verdict || 'Wrong Answer'}
                            </div>
                          )}

                          {/* Show execution metrics */}
                          {testCase.executionTime !== undefined && (
                            <div
                              style={{
                                fontSize: 'clamp(0.35rem, 1.0vw, 0.45rem)',
                                color: textColor,
                                marginTop: '0.5rem',
                                opacity: 0.8,
                              }}
                            >
                              {testCase.executionTime}ms
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onClose}
              style={{
                border: '3px solid #212529',
                backgroundColor: isComplete ? '#2D58A6' : 'white',
                color: isComplete ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: isComplete ? '2px 2px 0px #212529' : 'none',
                fontSize: 'clamp(0.5rem, 1.3vw, 0.6rem)',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                transition: 'all 0.15s ease-in-out',
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
              {isComplete ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubmissionTracker;
