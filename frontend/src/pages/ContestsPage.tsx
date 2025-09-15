/**
 * CS Club Hackathon Platform - Contests Management Page
 * Phase 2.3: Contest list and management interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import apiService from '../services/api';
import { MdEdit } from 'react-icons/md';

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

const processSimpleMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

const ContestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Menu and dialog states
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; contestId: number } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Contest | null>(null);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminContests();
      if (response.success) {
        setContests(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch contests');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contestId: number) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, contestId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const getContestStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'frozen': return 'warning';
      case 'ended': return 'pending';
      default: return 'info';
    }
  };

  const getContestStatusText = (status: string) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'running': return 'Running';
      case 'frozen': return 'Frozen';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  const handleContestAction = async (contestId: number, action: 'start' | 'freeze' | 'end') => {
    try {
      setActionLoading(contestId);
      let response;
      
      switch (action) {
        case 'start':
          response = await apiService.startContest(contestId);
          break;
        case 'freeze':
          response = await apiService.freezeContest(contestId);
          break;
        case 'end':
          response = await apiService.endContest(contestId);
          break;
      }
      
      if (response.success) {
        await fetchContests(); // Refresh the list
      } else {
        setError(response.message || `Failed to ${action} contest`);
      }
    } catch (error: any) {
      setError(error.message || `Failed to ${action} contest`);
    } finally {
      setActionLoading(null);
      handleMenuClose();
    }
  };

  const handleDeleteContest = async () => {
    if (!deleteDialog) return;
    
    try {
      setActionLoading(deleteDialog.id);
      const response = await apiService.deleteContest(deleteDialog.id);
      
      if (response.success) {
        await fetchContests(); // Refresh the list
        setDeleteDialog(null);
      } else {
        setError(response.message || 'Failed to delete contest');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete contest');
    } finally {
      setActionLoading(null);
    }
  };

  const canStartContest = (contest: Contest) => {
    return contest.status === 'not_started' && new Date(contest.start_time) <= new Date();
  };

  const canFreezeContest = (contest: Contest) => {
    return contest.status === 'running';
  };

  const canEndContest = (contest: Contest) => {
    return contest.status === 'running' || contest.status === 'frozen';
  };

  if (loading) {
    return (
      <div className="flex-center full-height">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--background-default)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="navbar bg-primary" style={{ color: 'white' }}>
        <div className="flex align-center">
          <button
            className="btn btn-text"
            onClick={() => navigate('/admin/dashboard')}
            style={{ color: 'white', marginRight: '16px' }}
          >
            ← Back
          </button>
          <h1 style={{ color: 'white', flexGrow: 1 }}>Contest Management</h1>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/admin/contests/new')}
        >
          + Create Contest
        </button>
      </div>

      <div className="p-3">
        {/* Error Alert */}
        {error && (
          <div className="alert alert-error" style={{ position: 'relative' }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '12px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Contests Grid */}
        {contests.length === 0 ? (
          <div className="card text-center" style={{ padding: '48px' }}>
            <div className="card-content">
              <h2 className="text-secondary mb-3">No contests created yet</h2>
              <p className="text-secondary mb-4">
                Create your first contest to get started with your hackathon platform
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/admin/contests/new')}
              >
                + Create First Contest
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '24px' 
          }}>
            {contests.map((contest) => (
              <div key={contest.id}>
                <div 
                  className="card" 
                  style={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease-in-out',
                  }}
                  onClick={() => navigate(`/admin/contests/${contest.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  <div className="card-content">
                    {/* Header with status and menu */}
                    <div className="flex justify-between align-center mb-3">
                      <h3 style={{ fontWeight: 600, flex: 1, margin: 0 }}>
                        {contest.contest_name}
                      </h3>
                      <div className="flex align-center" style={{ gap: '8px' }}>
                        <span className={`chip chip-${getContestStatusColor(contest.status)}`}>
                          {getContestStatusText(contest.status)}
                        </span>
                        <button
                          className="btn btn-text"
                          onClick={(e) => handleMenuOpen(e, contest.id)}
                          disabled={actionLoading === contest.id}
                          style={{ padding: '4px', minHeight: 'auto' }}
                        >
                          {actionLoading === contest.id ? (
                            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                          ) : (
                            '⋮'
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="mb-3 text-secondary" style={{ fontSize: '0.9rem' }}>
                      {contest.description ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: processSimpleMarkdown(contest.description)
                          }}
                        />
                      ) : (
                        <p className="text-secondary">No description</p>
                      )}
                    </div>
                    
                    {/* Contest Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                        <strong>Code:</strong> {contest.registration_code}
                      </p>
                      
                      <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                        <strong>Duration:</strong> {contest.duration} minutes
                      </p>
                      
                      <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>
                        <strong>Start:</strong> {new Date(contest.start_time).toLocaleString()}
                      </p>
                      
                      <div className="flex justify-between mt-3">
                        <div className="flex align-center" style={{ gap: '4px' }}>
                          <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}><MdEdit /></span>
                          <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                            {contest.problems_count || 0} problems
                          </span>
                        </div>
                        
                        <div className="flex align-center" style={{ gap: '4px' }}>
                          <span style={{ fontSize: '16px' }}>Teams:</span>
                          <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                            {contest.teams_count || 0} teams
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contest Action Menu */}
      {menuAnchor && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }}
          onClick={handleMenuClose}
        >
          <div 
            className="card"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: '200px',
              maxWidth: '300px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-content" style={{ padding: '8px 0' }}>
              {canStartContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
                <button 
                  className="btn btn-text w-100 text-left"
                  onClick={() => handleContestAction(menuAnchor.contestId, 'start')}
                  style={{ justifyContent: 'flex-start', padding: '8px 16px' }}
                >
                  Start Contest
                </button>
              )}
              
              {canFreezeContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
                <button 
                  className="btn btn-text w-100 text-left"
                  onClick={() => handleContestAction(menuAnchor.contestId, 'freeze')}
                  style={{ justifyContent: 'flex-start', padding: '8px 16px' }}
                >
                  Freeze Scoreboard
                </button>
              )}
              
              {canEndContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
                <button 
                  className="btn btn-text w-100 text-left"
                  onClick={() => handleContestAction(menuAnchor.contestId, 'end')}
                  style={{ justifyContent: 'flex-start', padding: '8px 16px' }}
                >
                  End Contest
                </button>
              )}
              
              <button 
                className="btn btn-text w-100 text-left"
                onClick={() => navigate(`/admin/contests/${menuAnchor.contestId}/edit`)}
                style={{ justifyContent: 'flex-start', padding: '8px 16px' }}
              >
                Edit Contest
              </button>
              
              <button 
                className="btn btn-text w-100 text-left"
                onClick={() => {
                  const contest = contests.find(c => c.id === menuAnchor.contestId)!;
                  setDeleteDialog(contest);
                  handleMenuClose();
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 16px', color: 'var(--contest-wrong-answer)' }}
              >
                Delete Contest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div className="card" style={{ maxWidth: '400px', margin: '16px' }}>
            <div className="card-header">
              <h3 className="card-title">Delete Contest</h3>
            </div>
            <div className="card-content">
              <p>
                Are you sure you want to delete "{deleteDialog?.contest_name}"? This action cannot be undone.
              </p>
            </div>
            <div className="card-actions">
              <button className="btn btn-text" onClick={() => setDeleteDialog(null)}>Cancel</button>
              <button 
                className="btn btn-primary"
                onClick={handleDeleteContest}
                disabled={actionLoading === deleteDialog?.id}
                style={{ backgroundColor: 'var(--contest-wrong-answer)' }}
              >
                {actionLoading === deleteDialog?.id ? (
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestsPage;