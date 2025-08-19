/**
 * CS Club Hackathon Platform - Problem View Page (Modern Admin Style)
 * Updated to match new design system
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/theme.css';

// Mock problem data - will be replaced with API calls
const mockProblem: Problem = {
  id: 1,
  contestId: 1,
  problemLetter: 'A',
  title: 'Matrix Multiplication',
  description: `Given two matrices **A** and **B**, compute their product **C = A × B**.

## Problem Description

Matrix multiplication is a fundamental operation in linear algebra. Given two matrices:
- Matrix A of size n × m
- Matrix B of size m × p

The product C = A × B will be a matrix of size n × p where:

C[i][j] = sum(A[i][k] × B[k][j]) for k = 1 to m

## Input Format
- First line: three integers n, m, p representing the dimensions
- Next n lines: each contains m integers representing matrix A
- Next m lines: each contains p integers representing matrix B

## Output Format  
Output n lines, each containing p integers representing the resulting matrix C.

## Constraints
- 1 ≤ n, m, p ≤ 100
- -1000 ≤ matrix elements ≤ 1000

## Sample Input
\`\`\`
2 3 2
1 2 3
4 5 6
7 8
9 10
11 12
\`\`\`

## Sample Output
\`\`\`
58 64
139 154
\`\`\`

## Explanation
Matrix A is 2×3 and Matrix B is 3×2, so the result is 2×2.`,
  difficulty: 'medium',
  timeLimit: 2000,
  memoryLimit: 256,
  sampleInput: '2 3 2\n1 2 3\n4 5 6\n7 8\n9 10\n11 12',
  sampleOutput: '58 64\n139 154',
  tags: ['implementation', 'mathematics'],
  submitCount: 245,
  acceptedCount: 123,
  userAttempts: 0,
  userSolved: false,
  lastSubmissionVerdict: null,
  isPublic: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const ProblemViewPage: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [problem, setProblem] = useState<Problem | null>(mockProblem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    if (problemId) {
      fetchProblem(problemId);
    }
  }, [problemId]);

  const fetchProblem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // For now, use mock data
      setTimeout(() => {
        setProblem(mockProblem);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load problem');
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSubmit = () => {
    navigate(`/problem/${problemId}/submit`);
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

  return (
    <div style={{
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      minHeight: '100vh',
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
              Problem {problem.problemLetter}: {problem.title}
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
          onClick={handleSubmit}
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
          Submit Solution
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          padding: '32px',
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

        {/* Problem Stats */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          marginTop: '24px',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '16px',
          }}>
            Problem Statistics
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Submissions</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
                {problem.submitCount}
              </div>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Accepted</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#16a34a' }}>
                {problem.acceptedCount}
              </div>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Acceptance Rate</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
                {((problem.acceptedCount / problem.submitCount) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemViewPage;