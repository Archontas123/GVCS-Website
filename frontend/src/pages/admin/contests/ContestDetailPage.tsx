/**
 * Contest Detail Page - RETRO STYLE
 * Matching the Hack The Valley retro aesthetic
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';
import Breadcrumb from '../../../components/common/Breadcrumb';
import DateTimePicker from '../../../components/common/DateTimePicker';
import AddProblemModal from '../../../components/Admin/AddProblemModal';
import { getContestUrl } from '../../../utils/contestUtils';
import { MdEdit } from 'react-icons/md';

interface Contest {
  id: number;
  contest_name: string;
  description: string;
  manual_control?: boolean;
  registration_code: string;
  contest_url?: string;
  status: 'pending_manual' | 'not_started' | 'running' | 'frozen' | 'ended';
  is_active: boolean;
}

interface Team {
  id: number;
  team_name: string;
  team_lead_name: string;
  team_lead_email: string;
  registration_time: string;
  members_count: number;
}

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_in_contest: number;
}

const ContestDetailPage: React.FC = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [contest, setContest] = useState<Contest | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Manage Contests', href: '/admin/contests' },
    { label: contest?.contest_name || 'Loading...', href: `/admin/contests/${contestId}` }
  ];

  useEffect(() => {
    if (contestId) {
      fetchContestData();
    }
  }, [contestId]);

  useEffect(() => {
    if (activeTab === 1 && teams.length === 0) {
      fetchTeams();
    } else if (activeTab === 2 && problems.length === 0) {
      fetchProblems();
    }
  }, [activeTab]);

  const fetchContestData = async () => {
    try {
      setLoading(true);
      setError(null);

      const contestResult = await apiService.getAdminContest(parseInt(contestId!));
      if (contestResult.success && contestResult.data) {
        setContest(contestResult.data);
      } else {
        throw new Error('Failed to fetch contest details');
      }
    } catch (error) {
      console.error('Failed to fetch contest data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contest data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsResult = await apiService.getAdminContestTeams(parseInt(contestId!));
      if (teamsResult.success && teamsResult.data) {
        setTeams(teamsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchProblems = async () => {
    try {
      const problemsResult = await apiService.getAdminContestProblems(parseInt(contestId!));
      if (problemsResult.success && problemsResult.data) {
        setProblems(problemsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    }
  };

  const handleProblemAdded = () => {
    fetchProblems();
    setAddProblemModalOpen(false);
  };

  const handleDeleteProblem = async (problemId: number, problemTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the problem "${problemTitle}"?\n\nThis action cannot be undone. The problem can only be deleted if it has no submissions.`)) {
      return;
    }

    try {
      const result = await apiService.deleteProblem(problemId);
      if (result.success) {
        // Refresh the problems list
        fetchProblems();
      } else {
        alert(result.message || 'Failed to delete problem');
      }
    } catch (error: any) {
      console.error('Failed to delete problem:', error);
      alert(error.response?.data?.message || 'Failed to delete problem. It may have submissions or you may not have permission.');
    }
  };

  const handleSaveChanges = async () => {
    if (!contest) return;

    try {
      setSaving(true);
      const result = await apiService.updateContest(contest.id, {
        contest_name: contest.contest_name,
        description: contest.description,
        manual_control: contest.manual_control ?? true,
        is_active: contest.is_active
      });
      if (result.success) {
        console.log('Contest updated successfully');
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to update contest');
      }
    } catch (error) {
      console.error('Failed to save contest:', error);
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getContestUrlForContest = () => {
    if (!contest) return '';
    return contest.contest_url || getContestUrl(contest.contest_name);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'hard': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const handleStartContest = async () => {
    if (!contest) return;

    if (!window.confirm(`Start contest "${contest.contest_name}"?\n\nThis will make the contest active and allow teams to submit solutions.`)) {
      return;
    }

    try {
      setActionInProgress(true);
      const result = await apiService.startContest(contest.id);
      if (result.success) {
        alert('Contest started successfully!');
        await fetchContestData(); // Refresh contest data
      } else {
        throw new Error(result.message || 'Failed to start contest');
      }
    } catch (error: any) {
      console.error('Failed to start contest:', error);
      // Extract error message from API response
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start contest';
      alert(`Cannot start contest:\n\n${errorMessage}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEndContest = async () => {
    if (!contest) return;

    if (!window.confirm(`End contest "${contest.contest_name}"?\n\nThis will stop the contest and prevent any further submissions. This action cannot be undone.`)) {
      return;
    }

    try {
      setActionInProgress(true);
      const result = await apiService.endContest(contest.id);
      if (result.success) {
        alert('Contest ended successfully!');
        await fetchContestData(); // Refresh contest data
      } else {
        throw new Error(result.message || 'Failed to end contest');
      }
    } catch (error: any) {
      console.error('Failed to end contest:', error);
      // Extract error message from API response
      const errorMessage = error.response?.data?.message || error.message || 'Failed to end contest';
      alert(`Cannot end contest:\n\n${errorMessage}`);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading && !contest) {
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
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#CECDE2',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid transparent',
              borderTop: '4px solid #212529',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div
          style={{
            fontFamily: "'Press Start 2P', cursive",
            backgroundColor: '#CECDE2',
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            minHeight: '100vh',
            padding: '32px 16px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                color: '#dc2626',
                fontSize: '0.7rem',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              Error: {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1rem',
                padding: '16px 24px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!contest) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div
          style={{
            fontFamily: "'Press Start 2P', cursive",
            backgroundColor: '#CECDE2',
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <h2 style={{
            marginBottom: '24px',
            color: 'white',
            fontSize: '1.5rem',
            textShadow: '4px 4px 0px #212529',
          }}>
            Contest not found
          </h2>
          <button
            onClick={() => navigate('/admin/contests')}
            style={{
              border: '4px solid #212529',
              backgroundColor: '#2D58A6',
              color: 'white',
              boxShadow: '6px 6px 0px #212529',
              textShadow: '2px 2px 0px #212529',
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', cursive",
            }}
          >
            ← Back to Contests
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div
        style={{
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: '#CECDE2',
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          minHeight: '100vh',
          padding: '32px 16px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '4px 4px 0px #212529',
            }}>
              {contest.contest_name}
            </h1>

            <h2 style={{
              fontSize: 'clamp(0.6rem, 2vw, 0.8rem)',
              color: '#FFD700',
              marginBottom: '24px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0px #212529',
            }}>
              {getContestUrlForContest()}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/admin/contests')}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#ffffff',
                  color: '#212529',
                  boxShadow: '4px 4px 0px #212529',
                  fontSize: '0.65rem',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => window.open(getContestUrlForContest(), '_blank')}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#2D58A6',
                  color: 'white',
                  boxShadow: '4px 4px 0px #212529',
                  textShadow: '2px 2px 0px #212529',
                  fontSize: '0.65rem',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                }}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '0',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setActiveTab(0)}
              style={{
                border: '4px solid #212529',
                backgroundColor: activeTab === 0 ? '#2D58A6' : '#ffffff',
                color: activeTab === 0 ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: activeTab === 0 ? '2px 2px 0px #212529' : 'none',
                fontSize: '0.65rem',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                flex: 1,
                minWidth: '120px',
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab(1)}
              style={{
                border: '4px solid #212529',
                backgroundColor: activeTab === 1 ? '#2D58A6' : '#ffffff',
                color: activeTab === 1 ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: activeTab === 1 ? '2px 2px 0px #212529' : 'none',
                fontSize: '0.65rem',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                flex: 1,
                minWidth: '120px',
              }}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab(2)}
              style={{
                border: '4px solid #212529',
                backgroundColor: activeTab === 2 ? '#2D58A6' : '#ffffff',
                color: activeTab === 2 ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: activeTab === 2 ? '2px 2px 0px #212529' : 'none',
                fontSize: '0.65rem',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                flex: 1,
                minWidth: '120px',
              }}
            >
              Problems ({problems.length})
            </button>
          </div>

          {/* Tab Content */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              borderTop: 'none',
              boxShadow: '8px 8px 0px #212529',
              padding: '24px',
              minHeight: '400px',
            }}
          >
            {activeTab === 0 && contest && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '3px solid #212529' }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0, color: '#212529' }}>
                    Contest Details
                  </h3>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    style={{
                      background: saving ? '#6b7280' : '#2D58A6',
                      color: 'white',
                      border: '4px solid #212529',
                      boxShadow: '4px 4px 0px #212529',
                      textShadow: '2px 2px 0px #212529',
                      padding: '10px 16px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: "'Press Start 2P', cursive",
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      color: '#212529',
                    }}>
                      Contest Name
                    </label>
                    <input
                      type="text"
                      value={contest.contest_name}
                      onChange={(e) => setContest({ ...contest, contest_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '4px solid #212529',
                        background: '#ffffff',
                        color: '#212529',
                        fontSize: '0.7rem',
                        fontFamily: "'Press Start 2P', cursive",
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      color: '#212529',
                    }}>
                      Registration Code
                    </label>
                    <input
                      type="text"
                      value={contest.registration_code}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '4px solid #212529',
                        background: '#e0e7ff',
                        color: '#2D58A6',
                        fontSize: '0.8rem',
                        fontFamily: "'Press Start 2P', cursive",
                        fontWeight: 'bold',
                        letterSpacing: '3px',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                    <small style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#6b7280',
                      fontSize: '0.55rem',
                    }}>
                      Teams use this code to register
                    </small>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
                    color: '#212529',
                  }}>
                    Contest URL
                  </label>
                  <input
                    type="text"
                    value={getContestUrlForContest()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '4px solid #212529',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '0.65rem',
                      fontFamily: "'Press Start 2P', cursive",
                      boxShadow: '4px 4px 0px #212529',
                    }}
                  />
                  <small style={{
                    display: 'block',
                    marginTop: '6px',
                    color: '#6b7280',
                    fontSize: '0.55rem',
                  }}>
                    Auto-generated from contest name
                  </small>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
                    color: '#212529',
                  }}>
                    Description
                  </label>
                  <textarea
                    value={contest.description}
                    onChange={(e) => setContest({ ...contest, description: e.target.value })}
                    placeholder="Enter contest description (supports markdown)"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '4px solid #212529',
                      background: '#ffffff',
                      color: '#212529',
                      fontSize: '0.65rem',
                      fontFamily: "'Press Start 2P', cursive",
                      resize: 'vertical',
                      lineHeight: '1.6',
                      boxShadow: '4px 4px 0px #212529',
                    }}
                  />
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f9fafb',
                    border: '3px solid #212529'
                  }}>
                    <h4 style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '0.6rem', margin: '0 0 8px 0', color: '#212529' }}>
                      Preview:
                    </h4>
                    <div style={{ color: '#374151', fontSize: '0.65rem', lineHeight: '1.6' }}>
                      <ReactMarkdown>
                        {contest.description || '*No description provided*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Contest Control Panel */}
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  border: '4px solid #212529',
                  background: contest.is_active ? '#dcfce7' : '#fef9c3',
                  boxShadow: '6px 6px 0px #212529',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h4 style={{
                        margin: '0 0 8px 0',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#212529',
                      }}>
                        Contest Status: {contest.is_active ? '🟢 ACTIVE' : '⚪ INACTIVE'}
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '0.6rem',
                        lineHeight: '1.6',
                        color: '#4b5563',
                      }}>
                        {contest.is_active
                          ? 'Contest is running. Teams can submit solutions.'
                          : 'Contest is not active. Click Start to begin.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {!contest.is_active ? (
                        <button
                          onClick={handleStartContest}
                          disabled={actionInProgress}
                          style={{
                            background: actionInProgress ? '#6b7280' : '#16a34a',
                            color: 'white',
                            border: '4px solid #212529',
                            boxShadow: '4px 4px 0px #212529',
                            textShadow: '2px 2px 0px #212529',
                            padding: '12px 20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            cursor: actionInProgress ? 'not-allowed' : 'pointer',
                            fontFamily: "'Press Start 2P', cursive",
                          }}
                          onMouseEnter={(e) => {
                            if (!actionInProgress) e.currentTarget.style.backgroundColor = '#15803d';
                          }}
                          onMouseLeave={(e) => {
                            if (!actionInProgress) e.currentTarget.style.backgroundColor = '#16a34a';
                          }}
                        >
                          {actionInProgress ? '⏳ Starting...' : '▶️ Start Contest'}
                        </button>
                      ) : (
                        <button
                          onClick={handleEndContest}
                          disabled={actionInProgress}
                          style={{
                            background: actionInProgress ? '#6b7280' : '#dc2626',
                            color: 'white',
                            border: '4px solid #212529',
                            boxShadow: '4px 4px 0px #212529',
                            textShadow: '2px 2px 0px #212529',
                            padding: '12px 20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            cursor: actionInProgress ? 'not-allowed' : 'pointer',
                            fontFamily: "'Press Start 2P', cursive",
                          }}
                          onMouseEnter={(e) => {
                            if (!actionInProgress) e.currentTarget.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            if (!actionInProgress) e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                        >
                          {actionInProgress ? '⏳ Ending...' : '⏹️ End Contest'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>


              </div>
            )}

            {activeTab === 1 && (
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '24px', fontSize: '0.9rem', margin: '0 0 24px 0', color: '#212529', borderBottom: '3px solid #212529', paddingBottom: '12px' }}>
                  Registered Teams
                </h3>

                {teams.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', border: '3px dashed #212529' }}>
                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '8px' }}>
                      No teams registered yet
                    </p>
                    <p style={{ fontSize: '0.6rem', color: '#9ca3af', margin: 0 }}>
                      Teams will appear here once they register for this contest.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teams.map((team, index) => (
                      <div
                        key={team.id}
                        onClick={() => navigate(`/admin/contests/${contestId}/teams/${team.id}`)}
                        style={{
                          padding: '16px',
                          border: '4px solid #212529',
                          background: '#ffffff',
                          boxShadow: '4px 4px 0px #212529',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                          e.currentTarget.style.transform = 'translate(-2px, -2px)';
                          e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                        }}
                      >
                        <h4 style={{ fontWeight: 'bold', fontSize: '0.75rem', margin: '0 0 12px 0', color: '#212529' }}>
                          {index + 1}. {team.team_name}
                        </h4>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280', lineHeight: '1.8' }}>
                          <div>Lead: {team.team_lead_name} ({team.team_lead_email})</div>
                          <div>Members: {team.members_count}</div>
                          <div>Registered: {new Date(team.registration_time).toLocaleString()}</div>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.55rem', color: '#2D58A6', fontWeight: 'bold' }}>
                          Click to view submissions →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 2 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '3px solid #212529', paddingBottom: '12px' }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0, color: '#212529' }}>
                    Contest Problems
                  </h3>
                  <button
                    onClick={() => setAddProblemModalOpen(true)}
                    style={{
                      background: '#2D58A6',
                      color: 'white',
                      border: '4px solid #212529',
                      boxShadow: '4px 4px 0px #212529',
                      textShadow: '2px 2px 0px #212529',
                      padding: '10px 16px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: "'Press Start 2P', cursive",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B6BBD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2D58A6';
                    }}
                  >
                    + Add Problem
                  </button>
                </div>

                {problems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', border: '3px dashed #212529' }}>
                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '24px' }}>
                      No problems added yet
                    </p>
                    <button
                      onClick={() => setAddProblemModalOpen(true)}
                      style={{
                        background: '#2D58A6',
                        color: 'white',
                        border: '4px solid #212529',
                        boxShadow: '6px 6px 0px #212529',
                        textShadow: '2px 2px 0px #212529',
                        padding: '12px 24px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                      }}
                    >
                      + Add First Problem
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {problems.map((problem) => (
                      <div
                        key={problem.id}
                        onClick={() => navigate(`/admin/problems/${problem.id}`)}
                        style={{
                          padding: '16px',
                          border: '4px solid #212529',
                          background: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '4px 4px 0px #212529',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                          e.currentTarget.style.transform = 'translate(-2px, -2px)';
                          e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                          <h4 style={{ fontWeight: 'bold', fontSize: '0.75rem', margin: 0, color: '#212529' }}>
                            {problem.order_in_contest}. {problem.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                backgroundColor: getDifficultyColor(problem.difficulty) + '40',
                                color: getDifficultyColor(problem.difficulty),
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                padding: '4px 8px',
                                border: '2px solid ' + getDifficultyColor(problem.difficulty),
                              }}
                            >
                              {problem.difficulty}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent navigation
                                handleDeleteProblem(problem.id, problem.title);
                              }}
                              style={{
                                background: '#dc2626',
                                color: 'white',
                                border: '3px solid #212529',
                                boxShadow: '3px 3px 0px #212529',
                                textShadow: '1px 1px 0px #212529',
                                padding: '4px 8px',
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', cursive",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#b91c1c';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Add Problem Modal */}
        <AddProblemModal
          open={addProblemModalOpen}
          onClose={() => setAddProblemModalOpen(false)}
          contestId={parseInt(contestId!)}
          onProblemAdded={handleProblemAdded}
        />
      </div>
    </>
  );
};

export default ContestDetailPage;
