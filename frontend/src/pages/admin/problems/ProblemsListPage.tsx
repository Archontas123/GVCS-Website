/**
 * Hack The Valley - Manage Problems
 * Problem management interface using custom styles to match contests section
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';
import Breadcrumb from '../../../components/common/Breadcrumb';

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points_value: number;
  time_limit: number;
  memory_limit: number;
  contest_id: number;
  contest_name?: string;
}

const ProblemsListPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Manage Problems', href: '/admin/problems' }
  ];

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getAdminProblems();
      if (result.success && result.data) {
        setProblems(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch problems');
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
      setError(error instanceof Error ? error.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProblem = () => {
    navigate('/admin/problems/new');
  };

  const handleManageContests = () => {
    navigate('/admin/contests');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#007bff';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  const EmptyState: React.FC<{ type: 'problems', onCreate: () => void }> = ({ type, onCreate }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        padding: '48px 40px',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: '16px', color: '#6b7280' }}>Problems</div>
      <p
        style={{
          fontSize: '1.1rem',
          color: '#6b7280',
          marginBottom: '32px',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          fontWeight: 500,
        }}
      >
        You have not created any {type}.
      </p>
      <button
        onClick={onCreate}
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
        }}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
        Create {type === 'problems' ? 'Problem' : 'Problem'}
      </button>
    </div>
  );

  if (loading) {
    return (
      <>
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
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #1d4ed8',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          padding: '32px 16px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div 
            style={{ 
              padding: '16px 20px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span><strong>Error:</strong> {error}</span>
            <button
              onClick={fetchProblems}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 
            style={{ 
              fontWeight: 700, 
              fontSize: '2.4rem',
              color: '#1d4ed8',
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Hack The Valley
          </h1>
          
          <h2 
            style={{ 
              fontWeight: 500, 
              fontSize: '1.1rem',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Manage Problems
          </h2>
          
          <div 
            style={{
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
              margin: '0 auto',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
            }}
          ></div>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleManageContests}
              style={{
                background: '#ffffff',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Manage Contests
            </button>
            <button
              onClick={() => navigate('/admin/problems')}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
              }}
            >
              Manage Problems
            </button>
          </div>

          <button
            onClick={handleCreateProblem}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
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
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
            Create Problem
          </button>
        </div>

        {/* Main Content */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
            minHeight: '500px',
          }}
        >
          {problems.length === 0 ? (
            <EmptyState type="problems" onCreate={handleCreateProblem} />
          ) : (
            <div style={{ padding: '48px 40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {problems.map((problem) => (
                  <div
                    key={problem.id}
                    onClick={() => navigate(`/admin/problems/${problem.id}`)}
                    style={{
                      padding: '24px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1d4ed8';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.1)';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div>
                      {/* Problem Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 600, 
                          marginBottom: '0',
                          color: '#1f2937',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          {problem.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{
                              backgroundColor: getDifficultyColor(problem.difficulty) + '20',
                              color: getDifficultyColor(problem.difficulty),
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {getDifficultyText(problem.difficulty)}
                          </span>
                          <span
                            style={{
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                            }}
                          >
                            {problem.points_value} pts
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <div
                        style={{
                          color: '#6b7280',
                          fontSize: '1rem',
                          marginBottom: '16px',
                          lineHeight: '1.5',
                          maxHeight: '80px',
                          overflow: 'hidden',
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                            strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                          }}
                        >
                          {problem.description || 'No description provided'}
                        </ReactMarkdown>
                      </div>

                      {/* Problem Stats */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Time Limit:</span>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            {problem.time_limit}ms
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Memory Limit:</span>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            {problem.memory_limit}MB
                          </span>
                        </div>
                        {problem.contest_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Contest:</span>
                            <span style={{ 
                              color: '#1d4ed8', 
                              fontSize: '0.875rem', 
                              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                              fontWeight: 600,
                            }}>
                              {problem.contest_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/problems/${problem.id}`);
                        }}
                        style={{
                          background: '#ffffff',
                          color: '#1d4ed8',
                          border: '2px solid #1d4ed8',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#1d4ed8';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#1d4ed8';
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/problems/${problem.id}`);
                        }}
                        style={{
                          background: '#1d4ed8',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}
                        title="Edit Problem"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#1e40af';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#1d4ed8';
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <div 
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
              margin: '32px auto 24px',
              maxWidth: '400px',
            }}
          ></div>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            Need to return to team portal?{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                padding: '0',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.color = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.color = '#1d4ed8';
              }}
            >
              Click here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProblemsListPage;