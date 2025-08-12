/**
 * CS Club Hackathon Platform - Team Dashboard Page
 * Phase 5.1: Enhanced Contest Dashboard with real-time updates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  LinearProgress,
  Alert,
  Grid,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Code,
  CheckCircle,
  Cancel,
  Schedule,
  HelpOutline,
  EmojiEvents,
  Speed,
  Assignment,
  Timer,
  Leaderboard,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Home,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Problem, ProblemStatus, ContestTimer, LeaderboardEntry } from '../types';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Mock data for Phase 1.4 - will be replaced with API calls later
const mockProblems: Problem[] = [
  {
    id: 1,
    contestId: 1,
    problemLetter: 'A',
    title: 'Simple Addition',
    description: 'Add two integers and output the result.',
    inputFormat: 'Two integers a and b',
    outputFormat: 'The sum a + b',
    sampleInput: '3 5',
    sampleOutput: '8',
    constraints: '1 ≤ a, b ≤ 1000',
    timeLimit: 1000,
    memoryLimit: 256,
    difficulty: 'easy',
  },
  {
    id: 2,
    contestId: 1,
    problemLetter: 'B',
    title: 'Array Maximum',
    description: 'Find the maximum element in an array.',
    inputFormat: 'First line: n (array size), Second line: n integers',
    outputFormat: 'Maximum element',
    sampleInput: '5\n1 3 7 2 5',
    sampleOutput: '7',
    constraints: '1 ≤ n ≤ 100000',
    timeLimit: 2000,
    memoryLimit: 512,
    difficulty: 'easy',
  },
  {
    id: 3,
    contestId: 1,
    problemLetter: 'C',
    title: 'Graph Traversal',
    description: 'Implement BFS on a graph.',
    inputFormat: 'Graph adjacency list',
    outputFormat: 'BFS traversal order',
    sampleInput: '4 4\n1 2\n1 3\n2 4\n3 4',
    sampleOutput: '1 2 3 4',
    constraints: '1 ≤ n ≤ 10000',
    timeLimit: 3000,
    memoryLimit: 256,
    difficulty: 'medium',
  },
  {
    id: 4,
    contestId: 1,
    problemLetter: 'D',
    title: 'Dynamic Programming',
    description: 'Solve the knapsack problem.',
    inputFormat: 'Items with weights and values',
    outputFormat: 'Maximum value',
    sampleInput: '3 10\n5 10\n4 40\n6 30',
    sampleOutput: '70',
    constraints: '1 ≤ n ≤ 1000',
    timeLimit: 5000,
    memoryLimit: 512,
    difficulty: 'hard',
  },
];

const mockProblemStatuses: ProblemStatus[] = [
  { problemLetter: 'A', solved: true, attempts: 1, solveTime: 15, firstToSolve: false },
  { problemLetter: 'B', solved: true, attempts: 3, solveTime: 45, firstToSolve: true },
  { problemLetter: 'C', solved: false, attempts: 2, solveTime: null, firstToSolve: false },
  { problemLetter: 'D', solved: false, attempts: 0, solveTime: null, firstToSolve: false },
];

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { team } = useAuth();
  
  const [problems, setProblems] = useState<Problem[]>(mockProblems);
  const [problemStatuses, setProblemStatuses] = useState<ProblemStatus[]>(mockProblemStatuses);
  const [contestTimer, setContestTimer] = useState<ContestTimer | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [teamRank, setTeamRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');

  const getProblemStatus = (problemLetter: string): ProblemStatus | null => {
    return problemStatuses.find(status => status.problemLetter === problemLetter) || null;
  };

  const getStatusIcon = (status: ProblemStatus | null) => {
    if (!status || status.attempts === 0) {
      return <HelpOutline sx={{ color: theme.palette.grey[400] }} />;
    }
    if (status.solved) {
      return <CheckCircle sx={{ color: theme.palette.contest.accepted }} />;
    }
    return <Cancel sx={{ color: theme.palette.contest.wrongAnswer }} />;
  };

  const getStatusColor = (status: ProblemStatus | null) => {
    if (!status || status.attempts === 0) {
      return theme.palette.grey[200];
    }
    if (status.solved) {
      return theme.palette.contest.accepted;
    }
    return theme.palette.contest.wrongAnswer;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return theme.palette.success.main;
      case 'medium': return theme.palette.warning.main;
      case 'hard': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  // Load real data on mount
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [team]);

  const loadDashboardData = async () => {
    if (!team) return;
    
    try {
      setLoading(true);
      
      // Load contest data
      const [contestResponse, leaderboardResponse] = await Promise.all([
        apiService.getTeamStatus(),
        apiService.getLeaderboard(team.contestCode || 1)
      ]);
      
      if (contestResponse.success && contestResponse.data) {
        const contest = contestResponse.data.contest;
        // Calculate contest timer
        const startTime = new Date(contest.startTime);
        const now = new Date();
        const timeElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const totalTime = contest.duration * 60;
        const timeRemaining = Math.max(0, totalTime - timeElapsed);
        
        setContestTimer({
          contestId: contest.id,
          startTime: contest.startTime,
          duration: contest.duration,
          timeRemaining,
          isRunning: timeRemaining > 0,
          isFrozen: false, // TODO: implement freeze logic
          hasEnded: timeRemaining <= 0
        });
      }
      
      if (leaderboardResponse.success && leaderboardResponse.data) {
        const leaderboard = leaderboardResponse.data.leaderboard;
        const teamEntry = leaderboard.find((entry: LeaderboardEntry) => 
          entry.teamName === team.teamName
        );
        
        if (teamEntry) {
          setTeamRank(teamEntry.rank);
          setTeamStats({
            problemsSolved: teamEntry.problemsSolved,
            penaltyTime: teamEntry.penaltyTime,
            lastSubmissionTime: teamEntry.lastSubmissionTime
          });
          setProblemStatuses(teamEntry.problems);
        }
      }
      
      setConnectionStatus('connected');
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (!contestTimer) return theme.palette.primary.main;
    if (contestTimer.timeRemaining > 1800) return theme.palette.success.main; // > 30min = green
    if (contestTimer.timeRemaining > 300) return theme.palette.warning.main;  // > 5min = orange
    return theme.palette.error.main; // <= 5min = red
  };

  const handleKeyNavigation = (event: KeyboardEvent) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case 'ArrowLeft':
          // Navigate to previous problem
          event.preventDefault();
          break;
        case 'ArrowRight':
          // Navigate to next problem
          event.preventDefault();
          break;
        case 'h':
        case 'Home':
          event.preventDefault();
          navigate('/dashboard');
          break;
        case 'l':
          event.preventDefault();
          navigate('/leaderboard');
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [navigate]);

  const solvedCount = problemStatuses.filter(status => status.solved).length;
  const totalProblems = problems.length;
  const progress = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
  const totalAttempts = problemStatuses.reduce((sum, status) => sum + status.attempts, 0);

  if (loading && !contestTimer) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>Loading contest data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header with Contest Timer */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.dark', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents /> Contest Dashboard
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {team?.teamName} • Contest: {team?.contestCode}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Tooltip title="Refresh Data">
              <IconButton 
                onClick={() => loadDashboardData()} 
                sx={{ color: 'inherit', mb: 1 }}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
            <Chip 
              label={connectionStatus} 
              size="small" 
              color={connectionStatus === 'connected' ? 'success' : 'error'}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>
        
        {/* Contest Timer */}
        {contestTimer && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" component="div" sx={{ 
              fontFamily: 'monospace', 
              fontWeight: 'bold',
              color: getTimerColor(),
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              {formatTime(contestTimer.timeRemaining)}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Timer /> 
              {contestTimer.hasEnded ? 'Contest Ended' : 
               contestTimer.isFrozen ? 'Leaderboard Frozen' : 
               contestTimer.isRunning ? 'Time Remaining' : 'Contest Not Started'}
            </Typography>
            {contestTimer.timeRemaining <= 300 && contestTimer.isRunning && (
              <Alert severity="warning" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                <Typography variant="body2">
                  ⚠️ Less than 5 minutes remaining! Make sure to submit your solutions.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Quick Navigation */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment /> Quick Navigation
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Tooltip title="Home (Ctrl+H)">
                  <IconButton onClick={() => navigate('/dashboard')} color="primary">
                    <Home />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Leaderboard (Ctrl+L)">
                  <IconButton onClick={() => navigate('/leaderboard')} color="primary">
                    <Leaderboard />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Code Editor Test">
                  <IconButton onClick={() => navigate('/editor-test')} color="primary">
                    <Code />
                  </IconButton>
                </Tooltip>
                {problems.map((problem, index) => (
                  <Tooltip key={problem.id} title={`Problem ${problem.problemLetter}: ${problem.title}`}>
                    <IconButton 
                      onClick={() => navigate(`/problem/${problem.id}`)}
                      sx={{ 
                        bgcolor: getStatusColor(getProblemStatus(problem.problemLetter)),
                        color: 'white',
                        fontWeight: 'bold',
                        '&:hover': {
                          bgcolor: getStatusColor(getProblemStatus(problem.problemLetter)),
                          opacity: 0.8
                        }
                      }}
                    >
                      {problem.problemLetter}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Use Ctrl+← → to navigate problems, Ctrl+H for home, Ctrl+L for leaderboard
              </Typography>
            </CardContent>
          </Card>

          {/* Problems Grid */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code /> Contest Problems
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
            {problems.map((problem, index) => {
              const status = getProblemStatus(problem.problemLetter);
              
              return (
                <Card
                  key={problem.id}
                  sx={{
                    height: '100%',
                    position: 'relative',
                    border: `3px solid ${getStatusColor(status)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8],
                      cursor: 'pointer'
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/problem/${problem.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Header with Badge */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Badge 
                          badgeContent={status?.firstToSolve ? '🥇' : status?.attempts || 0} 
                          color={status?.solved ? 'success' : status?.attempts ? 'error' : 'default'}
                        >
                          <Typography
                            variant="h3"
                            component="h3"
                            sx={{
                              fontWeight: 'bold',
                              color: theme.palette.primary.main,
                              fontFamily: 'monospace'
                            }}
                          >
                            {problem.problemLetter}
                          </Typography>
                        </Badge>
                        {getStatusIcon(status)}
                      </Box>

                      {/* Title */}
                      <Typography
                        variant="h6"
                        component="h4"
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.3,
                          mb: 2,
                        }}
                      >
                        {problem.title}
                      </Typography>

                      {/* Description Preview */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          flexGrow: 1,
                        }}
                      >
                        {problem.description}
                      </Typography>

                      {/* Metadata */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={problem.difficulty}
                            sx={{
                              bgcolor: getDifficultyColor(problem.difficulty),
                              color: 'white',
                              fontWeight: 500,
                            }}
                          />
                          <Chip
                            size="small"
                            label={`${problem.timeLimit}ms`}
                            variant="outlined"
                            icon={<Schedule />}
                          />
                        </Box>

                        {/* Status Info */}
                        {status && status.attempts > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {status.solved
                              ? `✅ Solved in ${status.solveTime}m (${status.attempts} attempt${status.attempts > 1 ? 's' : ''})`
                              : `❌ ${status.attempts} attempt${status.attempts > 1 ? 's' : ''} - not solved`}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Grid>
        
        {/* Team Stats Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Team Progress Card */}
          <Card sx={{ mb: 3, bgcolor: theme.palette.primary.light, color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed /> Team Progress
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {solvedCount}/{totalProblems}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Problems Solved
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  mb: 2,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'white',
                  },
                }}
              />
              
              {teamStats && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      #{teamRank || '?'}
                    </Typography>
                    <Typography variant="caption">Rank</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {teamStats.penaltyTime || 0}
                    </Typography>
                    <Typography variant="caption">Penalty</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {totalAttempts}
                    </Typography>
                    <Typography variant="caption">Attempts</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Problem Status Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment /> Problem Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {problems.map(problem => {
                  const status = getProblemStatus(problem.problemLetter);
                  return (
                    <Box key={problem.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 1, 
                      bgcolor: status?.solved ? theme.palette.success.light + '20' : 
                               status?.attempts ? theme.palette.error.light + '20' : 'transparent'
                    }}>
                      <Typography variant="h6" sx={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 'bold', 
                        minWidth: 24,
                        color: getStatusColor(status)
                      }}>
                        {problem.problemLetter}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {problem.title}
                        </Typography>
                        {status && status.attempts > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {status.solved ? 
                              `Solved in ${status.solveTime}m` : 
                              `${status.attempts} attempts`}
                          </Typography>
                        )}
                      </Box>
                      {getStatusIcon(status)}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
          
          {/* Keyboard shortcuts */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Keyboard Shortcuts</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Ctrl + H</Typography>
                  <Typography variant="caption">Home</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Ctrl + L</Typography>
                  <Typography variant="caption">Leaderboard</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Ctrl + ←/→</Typography>
                  <Typography variant="caption">Navigate Problems</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Connection Status Alert */}
      {connectionStatus !== 'connected' && (
        <Alert 
          severity={connectionStatus === 'error' ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
          action={
            <IconButton 
              color="inherit" 
              size="small" 
              onClick={() => loadDashboardData()}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          }
        >
          {connectionStatus === 'error' ? 
            'Failed to load contest data. Check your connection.' :
            'Disconnected from server. Data may be outdated.'}
        </Alert>
      )}
    </Box>
  );
};

export default DashboardPage;