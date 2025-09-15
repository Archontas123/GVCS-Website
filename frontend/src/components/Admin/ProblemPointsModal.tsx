import React, { useState, useEffect } from 'react';
import { MdInfo, MdCheckCircle, MdError } from 'react-icons/md';
import axios from 'axios';

interface ProblemPointsModalProps {
  open: boolean;
  onClose: () => void;
  problem: {
    id: number;
    title: string;
    max_points?: number;
  } | null;
  onUpdate: () => void;
}

interface ScoringStats {
  problemId: number;
  problemTitle: string;
  maxPoints: number;
  totalTestCases: number;
  sampleTestCases: number;
  scoringTestCases: number;
  pointsPerScoringTestCase: number;
  submissions: {
    total: number;
    fullPoints: number;
    partialPoints: number;
    zeroPoints: number;
    averageScore: string;
  };
}

const ProblemPointsModal: React.FC<ProblemPointsModalProps> = ({
  open,
  onClose,
  problem,
  onUpdate
}) => {
  const [maxPoints, setMaxPoints] = useState(100);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<ScoringStats | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (problem) {
      setMaxPoints(problem.max_points || 100);
      if (open) {
        loadScoringStats();
      }
    }
  }, [problem, open]);

  const loadScoringStats = async () => {
    if (!problem) return;
    
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `/api/admin/problems/${problem.id}/scoring-stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load scoring stats:', error);
      showNotification('Failed to load scoring statistics', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || maxPoints < 1 || maxPoints > 1000) {
      showNotification('Max points must be between 1 and 1000', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/admin/problems/${problem.id}/points`,
        { max_points: maxPoints },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification('Problem points updated successfully', 'success');
      onUpdate();
      loadScoringStats();
    } catch (error: any) {
      console.error('Failed to update problem points:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update problem points', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStats(null);
    onClose();
  };

  if (!problem) return null;

  return (
    <>
      {open && (
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
            maxWidth: '800px',
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
                Manage Points: {problem.title}
              </h2>
            </div>
            <div style={{
              padding: '24px 32px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 768 ? '1fr 1fr' : '1fr',
                gap: '24px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                <div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '20px'
                    }}>
                      Point Configuration
                    </h3>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Maximum Points
                      </label>
                      <input
                        type="number"
                        value={maxPoints}
                        onChange={(e) => setMaxPoints(parseInt(e.target.value) || 0)}
                        min="1"
                        max="1000"
                        style={{
                          width: '100%',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          padding: '12px 16px',
                          transition: 'all 0.2s ease',
                          backgroundColor: '#ffffff',
                          color: '#1f2937',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1d4ed8';
                          e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
                          e.target.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginTop: '6px'
                      }}>
                        Points will be distributed equally among non-sample test cases
                      </div>
                    </div>
                    
                    <div style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1e40af',
                      border: '1px solid #bae6fd',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      marginTop: '16px',
                      fontSize: '0.95rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdInfo style={{ fontSize: '18px' }} />
                        Scoring System:
                      </div>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Sample test cases award 0 points</li>
                        <li>Non-sample test cases split the total points equally</li>
                        <li>Points are only awarded for passed test cases</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '20px'
                    }}>
                      Scoring Statistics
                      {loadingStats && " (Loading...)"}
                    </h3>
                    
                    {stats ? (
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '8px' }}>
                          <strong>Current Max Points:</strong> {stats.maxPoints}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '8px' }}>
                          <strong>Test Cases:</strong> {stats.totalTestCases} total 
                          ({stats.sampleTestCases} sample, {stats.scoringTestCases} scoring)
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '8px' }}>
                          <strong>Points per Test Case:</strong> {stats.pointsPerScoringTestCase}
                        </div>
                        
                        <div style={{
                          height: '1px',
                          backgroundColor: '#e5e7eb',
                          margin: '16px 0'
                        }} />
                        
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          marginBottom: '12px'
                        }}>
                          Submission Performance:
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                          <strong>Total Submissions:</strong> {stats.submissions.total}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                          <strong>Full Points:</strong> {stats.submissions.fullPoints} submissions
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                          <strong>Partial Points:</strong> {stats.submissions.partialPoints} submissions
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                          <strong>Zero Points:</strong> {stats.submissions.zeroPoints} submissions
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                          <strong>Average Score:</strong> {stats.submissions.averageScore} points
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        {loadingStats ? 'Loading statistics...' : 'No statistics available'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 32px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={handleClose}
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
                onClick={handleSubmit}
                disabled={loading || maxPoints < 1 || maxPoints > 1000}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #1d4ed8',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  cursor: loading || maxPoints < 1 || maxPoints > 1000 ? 'not-allowed' : 'pointer',
                  opacity: loading || maxPoints < 1 || maxPoints > 1000 ? 0.6 : 1,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && maxPoints >= 1 && maxPoints <= 1000) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && maxPoints >= 1 && maxPoints <= 1000) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Updating...' : 'Update Points'}
              </button>
            </div>
            
            {notification && (
              <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fef2f2',
                color: notification.type === 'success' ? '#166534' : '#dc2626',
                border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {notification.type === 'success' ? <MdCheckCircle /> : <MdError />}
                {notification.message}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProblemPointsModal;