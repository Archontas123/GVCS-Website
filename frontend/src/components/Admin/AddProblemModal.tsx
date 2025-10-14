import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  contest_name: string;
  contest_id: number;
}

interface AddProblemModalProps {
  open: boolean;
  onClose: () => void;
  contestId: number;
  onProblemAdded: () => void;
}

const AddProblemModal: React.FC<AddProblemModalProps> = ({
  open,
  onClose,
  contestId,
  onProblemAdded
}) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchProblems();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProblems(problems);
    } else {
      const filtered = problems.filter(problem =>
        problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.contest_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProblems(filtered);
    }
  }, [searchTerm, problems]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getAdminProblems();
      if (result.success && result.data) {
        setProblems(result.data);
      } else {
        throw new Error('Failed to fetch problems');
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
      setError(error instanceof Error ? error.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProblem = async (problemId: number) => {
    try {
      setCopyingId(problemId);
      setError(null);

      const result = await apiService.copyProblemToContest(contestId, problemId);
      if (result.success) {
        onProblemAdded();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to add problem to contest');
      }
    } catch (error) {
      console.error('Failed to copy problem:', error);
      setError(error instanceof Error ? error.message : 'Failed to add problem to contest');
    } finally {
      setCopyingId(null);
    }
  };

  const handleCreateNew = () => {
    onClose();
    navigate('/admin/problems/new');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'hard': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onClose();
  };

  if (!open) return null;

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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "'Press Start 2P', cursive"
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '4px solid #212529',
          boxShadow: '8px 8px 0px #212529',
          minHeight: '600px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '3px solid #212529',
            backgroundColor: '#2D58A6'
          }}>
            <h2 style={{
              margin: 0,
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: 'white',
              textShadow: '2px 2px 0px #212529'
            }}>
              Add Problem
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'white',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px 24px', flex: 1, overflow: 'auto' }}>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '0.65rem',
                lineHeight: '1.6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: '#dc2626'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <input
              type="text"
              placeholder="Search problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '4px solid #212529',
                marginBottom: '16px',
                fontSize: '0.65rem',
                boxSizing: 'border-box',
                fontFamily: "'Press Start 2P', cursive",
                boxShadow: '4px 4px 0px #212529'
              }}
            />

            <p style={{ margin: '0 0 16px 0', fontSize: '0.6rem', color: '#6b7280', lineHeight: '1.6' }}>
              Select an existing problem to add to this contest:
            </p>

            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px'
              }}>
                <div style={{
                  border: '4px solid transparent',
                  borderTop: '4px solid #212529',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            ) : filteredProblems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', border: '3px dashed #212529' }}>
                <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.65rem', lineHeight: '1.6' }}>
                  {searchTerm.trim() !== '' ? 'No problems found matching your search.' : 'No problems available.'}
                </p>
                <button
                  onClick={handleCreateNew}
                  style={{
                    backgroundColor: '#2D58A6',
                    color: 'white',
                    border: '4px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                    textShadow: '2px 2px 0px #212529',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontFamily: "'Press Start 2P', cursive"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B6BBD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2D58A6';
                  }}
                >
                  Create New Problem
                </button>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {filteredProblems.map((problem) => (
                  <div
                    key={problem.id}
                    style={{
                      padding: '12px',
                      marginBottom: '12px',
                      cursor: copyingId === problem.id ? 'not-allowed' : 'pointer',
                      backgroundColor: '#ffffff',
                      border: '4px solid #212529',
                      boxShadow: '4px 4px 0px #212529',
                      opacity: copyingId === problem.id ? 0.6 : 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => copyingId !== problem.id && handleCopyProblem(problem.id)}
                    onMouseEnter={(e) => {
                      if (copyingId !== problem.id) {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                        e.currentTarget.style.transform = 'translate(-2px, -2px)';
                        e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copyingId !== problem.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'translate(0, 0)';
                        e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                      }
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>{problem.title}</span>
                        <span
                          style={{
                            backgroundColor: getDifficultyColor(problem.difficulty) + '40',
                            color: getDifficultyColor(problem.difficulty),
                            fontSize: '0.55rem',
                            padding: '4px 8px',
                            border: '2px solid ' + getDifficultyColor(problem.difficulty),
                            textTransform: 'uppercase'
                          }}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>
                        From: {problem.contest_name}
                      </div>
                    </div>
                    <div>
                      {copyingId === problem.id ? (
                        <div style={{
                          border: '3px solid transparent',
                          borderTop: '3px solid #212529',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyProblem(problem.id);
                          }}
                          style={{
                            backgroundColor: '#2D58A6',
                            color: 'white',
                            border: '3px solid #212529',
                            boxShadow: '3px 3px 0px #212529',
                            textShadow: '1px 1px 0px #212529',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.6rem',
                            fontFamily: "'Press Start 2P', cursive"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B6BBD';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#2D58A6';
                          }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '3px solid #212529',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: '#ffffff',
                color: '#212529',
                border: '4px solid #212529',
                boxShadow: '4px 4px 0px #212529',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: "'Press Start 2P', cursive"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNew}
              style={{
                backgroundColor: '#2D58A6',
                color: 'white',
                border: '4px solid #212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: "'Press Start 2P', cursive"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3B6BBD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2D58A6';
              }}
            >
              Create New Problem
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddProblemModal;
