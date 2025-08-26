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
      case 'easy': return '#10b981';
      case 'hard': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onClose();
  };

  if (!open) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        minHeight: '600px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontWeight: 600 }}>
            Add Problem to Contest
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px 24px', flex: 1, overflow: 'auto' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#dc2626',
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
            placeholder="Search problems by title or contest name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />

          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
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
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                {searchTerm.trim() !== '' ? 'No problems found matching your search.' : 'No problems available.'}
              </p>
              <button
                onClick={handleCreateNew}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Create New Problem
              </button>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {filteredProblems.map((problem, index) => (
                <div key={problem.id}>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: copyingId === problem.id ? 'not-allowed' : 'pointer',
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid #f3f4f6',
                      opacity: copyingId === problem.id ? 0.6 : 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => copyingId !== problem.id && handleCopyProblem(problem.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{problem.title}</span>
                        <span
                          style={{
                            backgroundColor: getDifficultyColor(problem.difficulty),
                            color: 'white',
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        From: {problem.contest_name}
                      </div>
                    </div>
                    <div>
                      {copyingId === problem.id ? (
                        <div style={{
                          border: '2px solid #f3f4f6',
                          borderTop: '2px solid #3b82f6',
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
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                  {index < filteredProblems.length - 1 && (
                    <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '8px 0' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateNew}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Create New Problem
          </button>
        </div>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default AddProblemModal;