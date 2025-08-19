/**
 * Hack The Valley - Admin Dashboard
 * Admin management interface for hackathon administration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import apiService from '../services/api';
import '../styles/theme.css';

interface Contest {
  id: number;
  contest_name: string;
  description: string;
  start_time: string;
  duration: number;
  status: 'not_started' | 'running' | 'frozen' | 'ended';
  is_active: boolean;
  registration_code: string;
  problems_count?: number;
  teams_count?: number;
}

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  contest_id?: number;
  created_at: string;
}

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();
  
  const [selectedTab, setSelectedTab] = useState(1); // Always show problems tab
  const [contests, setContests] = useState<Contest[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch contests
      const contestsResult = await apiService.getAdminContests();
      let fetchedContests: Contest[] = [];
      if (contestsResult.success && contestsResult.data) {
        fetchedContests = contestsResult.data;
        setContests(fetchedContests);
      } else {
        throw new Error(contestsResult.message || 'Failed to fetch contests');
      }

      // Fetch problems from all contests
      const allProblems: Problem[] = [];
      if (fetchedContests.length > 0) {
        for (const contest of fetchedContests) {
          try {
            const problemsResult = await apiService.getAdminContestProblems(contest.id);
            if (problemsResult.success && problemsResult.data) {
              // Transform backend data to frontend format
              const transformedProblems = problemsResult.data.map((problem: any) => ({
                id: problem.id,
                title: problem.title,
                difficulty: problem.difficulty || 'medium',
                contest_id: problem.contest_id,
                created_at: problem.created_at
              }));
              allProblems.push(...transformedProblems);
            }
          } catch (error) {
            console.error(`Failed to fetch problems for contest ${contest.id}:`, error);
          }
        }
      }
      
      setProblems(allProblems);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };


  const handleCreateContest = () => {
    navigate('/admin/contests/new');
  };

  const handleCreateProblem = () => {
    navigate('/admin/problems/new');
  };

  const handleManageContests = () => {
    navigate('/admin/contests');
  };

  const EmptyState: React.FC<{ type: 'contests' | 'problems', onCreate: () => void }> = ({ type, onCreate }) => (
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
        Create {type === 'contests' ? 'Contest' : 'Problem'}
      </button>
    </div>
  );

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
            Administrator Dashboard
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
              onClick={() => setSelectedTab(1)}
              style={{
                background: selectedTab === 1 ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : '#ffffff',
                color: selectedTab === 1 ? 'white' : '#374151',
                border: selectedTab === 1 ? 'none' : '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: selectedTab === 1 ? '0 4px 12px rgba(29, 78, 216, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
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

        {/* Error Display */}
        {error && (
          <div 
            style={{ 
              padding: '16px 20px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              marginBottom: '24px',
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
              onClick={fetchData}
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
        )}

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
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '400px' 
            }}>
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
          ) : (
            // Problems Tab
            problems.length === 0 ? (
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
                      <h3 style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 600, 
                        marginBottom: '12px',
                        color: '#1f2937',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      }}>
                        {problem.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            backgroundColor: problem.difficulty === 'easy' ? '#dcfce7' : 
                                           problem.difficulty === 'hard' ? '#fef2f2' : '#fef3c7',
                            color: problem.difficulty === 'easy' ? '#166534' : 
                                   problem.difficulty === 'hard' ? '#dc2626' : '#a16207',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          }}
                        >
                          {problem.difficulty}
                        </span>
                        {problem.created_at && (
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: '#6b7280',
                            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          }}>
                            Created: {new Date(problem.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
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
  );
};

export default AdminDashboardPage;