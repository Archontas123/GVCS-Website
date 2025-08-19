/**
 * CS Club Hackathon Platform - Contests Management Page
 * Phase 2.3: Contest list and management interface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  MoreVert,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Delete,
  People,
  Quiz,
} from '@mui/icons-material';
import { useAdminAuth } from '../hooks/useAdminAuth';
import apiService from '../services/api';

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
  const theme = useTheme();
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
      case 'ended': return 'default';
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Contest Management
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Add />}
            onClick={() => navigate('/admin/contests/new')}
            sx={{ ml: 2 }}
          >
            Create Contest
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Contests Grid */}
        {contests.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No contests created yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create your first contest to get started with your hackathon platform
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => navigate('/admin/contests/new')}
              >
                Create First Contest
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3 }}>
            {contests.map((contest) => (
              <Box key={contest.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                  onClick={() => navigate(`/admin/contests/${contest.id}`)}
                >
                  <CardContent>
                    {/* Header with status and menu */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
                        {contest.contest_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getContestStatusText(contest.status)}
                          color={getContestStatusColor(contest.status) as any}
                          size="small"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, contest.id)}
                          disabled={actionLoading === contest.id}
                        >
                          {actionLoading === contest.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <MoreVert />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Description */}
                    <Box sx={{ mb: 2, fontSize: '0.9rem', color: 'text.secondary' }}>
                      {contest.description ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: processSimpleMarkdown(contest.description)
                          }}
                        />
                      ) : (
                        <Typography color="text.secondary">No description</Typography>
                      )}
                    </Box>
                    
                    {/* Contest Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Code:</strong> {contest.registration_code}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        <strong>Duration:</strong> {contest.duration} minutes
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        <strong>Start:</strong> {new Date(contest.start_time).toLocaleString()}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Quiz sx={{ fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {contest.problems_count || 0} problems
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <People sx={{ fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {contest.teams_count || 0} teams
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Contest Action Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {menuAnchor && (
          <>
            {canStartContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
              <MenuItem onClick={() => handleContestAction(menuAnchor.contestId, 'start')}>
                <PlayArrow sx={{ mr: 1 }} />
                Start Contest
              </MenuItem>
            )}
            
            {canFreezeContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
              <MenuItem onClick={() => handleContestAction(menuAnchor.contestId, 'freeze')}>
                <Pause sx={{ mr: 1 }} />
                Freeze Scoreboard
              </MenuItem>
            )}
            
            {canEndContest(contests.find(c => c.id === menuAnchor.contestId)!) && (
              <MenuItem onClick={() => handleContestAction(menuAnchor.contestId, 'end')}>
                <Stop sx={{ mr: 1 }} />
                End Contest
              </MenuItem>
            )}
            
            <MenuItem onClick={() => navigate(`/admin/contests/${menuAnchor.contestId}/edit`)}>
              <Edit sx={{ mr: 1 }} />
              Edit Contest
            </MenuItem>
            
            <MenuItem 
              onClick={() => {
                const contest = contests.find(c => c.id === menuAnchor.contestId)!;
                setDeleteDialog(contest);
                handleMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <Delete sx={{ mr: 1 }} />
              Delete Contest
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteDialog)} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Contest</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog?.contest_name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button 
            onClick={handleDeleteContest} 
            color="error" 
            variant="contained"
            disabled={actionLoading === deleteDialog?.id}
          >
            {actionLoading === deleteDialog?.id ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContestsPage;