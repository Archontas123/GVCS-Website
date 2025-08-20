/**
 * Contest Detail Page - Custom Styles to match problems section
 * Contest detail view matching the problem pages design pattern
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  TextField
} from '@mui/material';
import { People, Quiz } from '@mui/icons-material';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';
import Breadcrumb from '../../../components/common/Breadcrumb';
import DateTimePicker from '../../../components/common/DateTimePicker';
import AddProblemModal from '../../../components/Admin/AddProblemModal';
import { getContestUrl } from '../../../utils/contestUtils';

interface Contest {
  id: number;
  contest_name: string;
  description: string;
  start_time: string;
  duration: number;
  freeze_time?: number;
  registration_code: string;
  contest_url?: string;
  status: 'not_started' | 'running' | 'frozen' | 'ended';
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

interface ProjectSubmission {
  id: number;
  team_id: number;
  team_name: string;
  project_title: string;
  project_description: string;
  original_filename: string;
  file_size: number;
  submitted_at: string;
}

const ContestDetailPage: React.FC = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [activeTab, setActiveTab] = useState(0);
  const [contest, setContest] = useState<Contest | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [projectSubmissions, setProjectSubmissions] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);

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
    } else if (activeTab === 3 && projectSubmissions.length === 0) {
      fetchProjectSubmissions();
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

  const fetchProjectSubmissions = async () => {
    try {
      const projectsResult = await apiService.getAdminContestProjects(parseInt(contestId!));
      if (projectsResult.success && projectsResult.data) {
        setProjectSubmissions(projectsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch project submissions:', error);
    }
  };

  const handleDownloadProject = async (submissionId: number, filename: string) => {
    try {
      const blob = await apiService.downloadProject(submissionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download project:', error);
      setError('Failed to download project file');
    }
  };

  const handleProblemAdded = () => {
    // Refresh the problems list
    fetchProblems();
    setAddProblemModalOpen(false);
  };

  const handleSaveChanges = async () => {
    if (!contest) return;

    try {
      setSaving(true);
      // Use updateContest instead of updateAdminContest since contest data is already in snake_case
      const result = await apiService.updateContest(contest.id, {
        contest_name: contest.contest_name,
        description: contest.description,
        start_time: contest.start_time,
        duration: contest.duration,
        freeze_time: contest.freeze_time,
        is_registration_open: contest.is_registration_open,
        is_active: contest.is_active
      });
      if (result.success) {
        console.log('Contest updated successfully');
        setError(null); // Clear any previous errors
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '';
      case 'frozen': return '';
      case 'ended': return '';
      default: return '';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#28a745';
      case 'hard': return '#dc3545';
      default: return '#ffc107';
    }
  };

  if (loading && !contest) {
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
              onClick={() => window.location.reload()}
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

  if (!contest) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ marginBottom: '16px', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
          Contest not found
        </h2>
        <button 
          onClick={() => navigate('/admin/contests')}
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}
        >
          Back to Contests
        </button>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: '0 0 8px 0',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
            >
              {contest.contest_name}
            </h1>
            <p
              style={{
                color: '#6b7280',
                fontSize: '1rem',
                margin: '0 0 8px 0',
                fontFamily: 'monospace',
              }}
            >
              {getContestUrlForContest()}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.open(getContestUrlForContest(), '_blank')}
              style={{
                background: '#ffffff',
                border: '2px solid #1d4ed8',
                borderRadius: '8px',
                color: '#1d4ed8',
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
              Preview Landing Page
            </button>
            <button
              onClick={() => window.open(`${getContestUrlForContest()}/problems`, '_blank')}
              style={{
                background: '#ffffff',
                border: '2px solid #1d4ed8',
                borderRadius: '8px',
                color: '#1d4ed8',
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
              Preview Problems Page
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex' }}>
            <button
              onClick={() => setActiveTab(0)}
              style={{
                background: activeTab === 0 ? '#1d4ed8' : 'transparent',
                color: activeTab === 0 ? 'white' : '#374151',
                border: 'none',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '64px',
                borderRadius: activeTab === 0 ? '8px 8px 0 0' : '0',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 0) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 0) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab(1)}
              style={{
                background: activeTab === 1 ? '#1d4ed8' : 'transparent',
                color: activeTab === 1 ? 'white' : '#374151',
                border: 'none',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '64px',
                borderRadius: activeTab === 1 ? '8px 8px 0 0' : '0',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 1) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 1) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab(2)}
              style={{
                background: activeTab === 2 ? '#1d4ed8' : 'transparent',
                color: activeTab === 2 ? 'white' : '#374151',
                border: 'none',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '64px',
                borderRadius: activeTab === 2 ? '8px 8px 0 0' : '0',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 2) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 2) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Problems ({problems.length})
            </button>
            <button
              onClick={() => setActiveTab(3)}
              style={{
                background: activeTab === 3 ? '#1d4ed8' : 'transparent',
                color: activeTab === 3 ? 'white' : '#374151',
                border: 'none',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '64px',
                borderRadius: activeTab === 3 ? '8px 8px 0 0' : '0',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 3) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 3) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Projects ({projectSubmissions.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '32px',
          }}
        >
          {activeTab === 0 && contest && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.25rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                  Contest Details
                </h3>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  style={{
                    background: saving ? '#6b7280' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <TextField
                  fullWidth
                  label="Contest Name"
                  value={contest.contest_name}
                  onChange={(e) => setContest({ ...contest, contest_name: e.target.value })}
                />

                <TextField
                  fullWidth
                  label="Registration Code"
                  value={contest.registration_code}
                  InputProps={{ readOnly: true }}
                  helperText="Teams use this code to register"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#1d4ed8',
                      letterSpacing: '1px'
                    }
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <TextField
                  fullWidth
                  label="Contest URL"
                  value={getContestUrlForContest()}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-generated from contest name"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={contest.description}
                  onChange={(e) => setContest({ ...contest, description: e.target.value })}
                  placeholder="Enter contest description (supports markdown)"
                />
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb' 
                }}>
                  <h4 style={{ marginBottom: '8px', fontWeight: 600, fontSize: '0.875rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    Preview:
                  </h4>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    <ReactMarkdown>
                      {contest.description || '*No description provided*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '1rem', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', color: '#374151' }}>
                    Start Time
                  </label>
                  <DateTimePicker
                    value={contest.start_time}
                    onChange={(value) => setContest({ ...contest, start_time: value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '1rem', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', color: '#374151' }}>
                    End Time
                  </label>
                  <DateTimePicker
                    value={new Date(new Date(contest.start_time).getTime() + contest.duration * 60000).toISOString()}
                    onChange={(value) => {
                      const endTime = new Date(value);
                      const startTime = new Date(contest.start_time);
                      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
                      setContest({ ...contest, duration });
                    }}
                  />
                </div>
              </div>

            </div>
          )}

          {activeTab === 1 && (
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '24px', fontSize: '1.25rem', margin: '0 0 24px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                Registered Teams
              </h3>
              
              {teams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <People style={{ fontSize: '64px', color: '#6b7280', marginBottom: '16px' }} />
                  <h4 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '1.25rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    No teams registered yet
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    Teams will appear here once they register for this contest.
                  </p>
                </div>
              ) : (
                <div>
                  {teams.map((team) => (
                    <div key={team.id} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ color: '#1d4ed8', fontSize: '1.2rem', marginTop: '4px' }}>•</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                          {team.team_name}
                        </h4>
                        <div>
                          <p style={{ marginBottom: '4px', fontSize: '0.875rem', margin: '0 0 4px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>Lead:</strong> {team.team_lead_name} ({team.team_lead_email})
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '0.875rem', margin: '0 0 4px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>Members:</strong> {team.members_count}
                          </p>
                          <p style={{ fontSize: '0.875rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>Registered:</strong> {new Date(team.registration_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.25rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                  Contest Problems
                </h3>
                <button
                  onClick={() => setAddProblemModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}
                >
                  Add Problem
                </button>
              </div>
              
              {problems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Quiz style={{ fontSize: '64px', color: '#6b7280', marginBottom: '16px' }} />
                  <h4 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '1.25rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    No problems added yet
                  </h4>
                  <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '0.875rem', margin: '0 0 24px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    Add problems to this contest to get started.
                  </p>
                  <button
                    onClick={() => setAddProblemModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}
                  >
                    Add First Problem
                  </button>
                </div>
              ) : (
                <div>
                  {problems.map((problem) => (
                    <div 
                      key={problem.id}
                      onClick={() => navigate(`/admin/problems/${problem.id}`)}
                      style={{ 
                        padding: '16px', 
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: '#1d4ed8', fontSize: '1.2rem' }}>•</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            {problem.order_in_contest}. {problem.title}
                          </h4>
                          <span
                            style={{
                              backgroundColor: getDifficultyColor(problem.difficulty) + '20',
                              color: getDifficultyColor(problem.difficulty),
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              padding: '4px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {problem.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '24px', fontSize: '1.25rem', margin: '0 0 24px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                Project Submissions
              </h3>
              
              {projectSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '64px', color: '#6b7280', marginBottom: '16px' }}>📁</div>
                  <h4 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '1.25rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    No project submissions yet
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                    Teams will be able to submit their project files here during the hackathon.
                  </p>
                </div>
              ) : (
                <div>
                  {projectSubmissions.map((submission) => (
                    <div 
                      key={submission.id}
                      style={{ 
                        padding: '20px', 
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: '#1d4ed8', fontSize: '1.5rem', marginTop: '4px' }}>📋</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', color: '#1f2937' }}>
                              {submission.project_title}
                            </h4>
                            <p style={{ fontWeight: 500, fontSize: '0.9rem', margin: '0 0 8px 0', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', color: '#1d4ed8' }}>
                              Team: {submission.team_name}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDownloadProject(submission.id, submission.original_filename)}
                            style={{
                              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            ⬇️ Download
                          </button>
                        </div>
                        
                        {submission.project_description && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '0.9rem', margin: 0, fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', color: '#4b5563', lineHeight: '1.5' }}>
                              {submission.project_description}
                            </p>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
                          <span style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>File:</strong> {submission.original_filename}
                          </span>
                          <span style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>Size:</strong> {(submission.file_size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
                            <strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Problem Modal */}
        <AddProblemModal
          open={addProblemModalOpen}
          onClose={() => setAddProblemModalOpen(false)}
          contestId={parseInt(contestId!)}
          onProblemAdded={handleProblemAdded}
        />
      </div>
    </div>
  );
};

export default ContestDetailPage;