/**
 * CS Club Hackathon Platform - Real-time Leaderboard Component
 * Phase 5.5: Live leaderboard with automatic updates and ranking animations
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Alert,
  Badge,
  useTheme,
  Fade,
  Slide,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove,
  EmojiEvents,
  Timer,
  CheckCircle,
  Cancel,
  Schedule,
  Visibility,
  VisibilityOff,
  Leaderboard as LeaderboardIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeData } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { LeaderboardData, LeaderboardTeam, ProblemStatus } from '../../services/websocket';
import ConnectionStatus from '../ConnectionStatus';

interface RealTimeLeaderboardProps {
  contestId: number;
  showTeamHighlight?: boolean;
  showProblemMatrix?: boolean;
  showLastUpdate?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
  maxTeams?: number;
  hideWhenFrozen?: boolean;
}

interface RankingChange {
  teamId: number;
  oldRank: number;
  newRank: number;
  timestamp: number;
}

const RealTimeLeaderboard: React.FC<RealTimeLeaderboardProps> = ({
  contestId,
  showTeamHighlight = true,
  showProblemMatrix = true,
  showLastUpdate = true,
  autoRefresh = true,
  refreshInterval = 30000,
  compact = false,
  maxTeams,
  hideWhenFrozen = false,
}) => {
  const theme = useTheme();
  const { team } = useAuth();
  const { 
    leaderboard, 
    lastLeaderboardUpdate, 
    isConnected, 
    connectionStatus 
  } = useRealTimeData(contestId);
  
  const [previousLeaderboard, setPreviousLeaderboard] = useState<LeaderboardData | null>(null);
  const [rankingChanges, setRankingChanges] = useState<RankingChange[]>([]);
  const [showRankingChanges, setShowRankingChanges] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track ranking changes
  useEffect(() => {
    if (leaderboard && previousLeaderboard) {
      const changes: RankingChange[] = [];
      
      leaderboard.teams.forEach(currentTeam => {
        const previousTeam = previousLeaderboard.teams.find(t => t.teamId === currentTeam.teamId);
        if (previousTeam && previousTeam.rank !== currentTeam.rank) {
          changes.push({
            teamId: currentTeam.teamId,
            oldRank: previousTeam.rank,
            newRank: currentTeam.rank,
            timestamp: Date.now(),
          });
        }
      });
      
      if (changes.length > 0) {
        setRankingChanges(prev => [...changes, ...prev].slice(0, 20)); // Keep last 20 changes
        
        // Auto-hide ranking changes after 10 seconds
        setTimeout(() => {
          setRankingChanges(prev => prev.filter(change => 
            Date.now() - change.timestamp < 10000
          ));
        }, 10000);
      }
    }
    
    if (leaderboard) {
      setPreviousLeaderboard(leaderboard);
    }
  }, [leaderboard, previousLeaderboard]);

  // Auto-refresh simulation (in real implementation, this would come from WebSocket)
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      // In real implementation, this would request fresh data
      setTimeout(() => setIsRefreshing(false), 500);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isConnected, refreshInterval]);

  // Get team ranking change
  const getTeamRankingChange = (teamId: number): RankingChange | null => {
    return rankingChanges.find(change => change.teamId === teamId) || null;
  };

  // Get problem status icon and color
  const getProblemStatusInfo = (problem: ProblemStatus) => {
    if (problem.solved) {
      return {
        icon: <CheckCircle />,
        color: theme.palette.success.main,
        text: `✓ ${problem.attempts}`,
        tooltip: `Solved in ${problem.solveTime} minutes (${problem.attempts} attempts)`,
      };
    } else if (problem.attempts > 0) {
      return {
        icon: <Cancel />,
        color: theme.palette.error.main,
        text: `✗ ${problem.attempts}`,
        tooltip: `${problem.attempts} failed attempts`,
      };
    } else {
      return {
        icon: <Remove />,
        color: theme.palette.grey[400],
        text: '—',
        tooltip: 'Not attempted',
      };
    }
  };

  // Format penalty time
  const formatPenaltyTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}`;
  };

  // Get display teams (with limit if specified)
  const displayTeams = useMemo(() => {
    if (!leaderboard) return [];
    return maxTeams ? leaderboard.teams.slice(0, maxTeams) : leaderboard.teams;
  }, [leaderboard, maxTeams]);

  // Get unique problem letters
  const problemLetters = useMemo(() => {
    if (!leaderboard || leaderboard.teams.length === 0) return [];
    return leaderboard.teams[0].problems.map(p => p.problemLetter).sort();
  }, [leaderboard]);

  // Don't show if frozen and hideWhenFrozen is true
  if (hideWhenFrozen && leaderboard?.isFrozen) {
    return (
      <Alert severity="info" icon={<Schedule />}>
        Leaderboard is frozen. Rankings will be revealed after the contest ends.
      </Alert>
    );
  }

  if (!leaderboard) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {isConnected ? (
              <>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Loading leaderboard...
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Leaderboard not available
                </Typography>
                <ConnectionStatus compact />
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LeaderboardIcon />
            Live Leaderboard
            {leaderboard.isFrozen && (
              <Chip 
                label="FROZEN" 
                size="small" 
                color="warning" 
                icon={<Schedule />}
              />
            )}
          </Typography>
          
          {isRefreshing && <LinearProgress sx={{ width: 50 }} />}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showLastUpdate && lastLeaderboardUpdate && (
            <Typography variant="caption" color="text.secondary">
              Updated {formatDistanceToNow(lastLeaderboardUpdate)} ago
            </Typography>
          )}
          
          <ConnectionStatus compact />
          
          <Tooltip title={showRankingChanges ? "Hide ranking changes" : "Show ranking changes"}>
            <IconButton 
              size="small" 
              onClick={() => setShowRankingChanges(!showRankingChanges)}
            >
              {showRankingChanges ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Ranking Changes Alert */}
      {showRankingChanges && rankingChanges.length > 0 && (
        <Fade in>
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            icon={<TrendingUp />}
            onClose={() => setRankingChanges([])}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Recent Ranking Changes:
            </Typography>
            {rankingChanges.slice(0, 3).map((change, index) => {
              const team = leaderboard.teams.find(t => t.teamId === change.teamId);
              if (!team) return null;
              
              return (
                <Typography key={index} variant="caption" display="block">
                  {team.teamName}: #{change.oldRank} → #{change.newRank}
                  {change.newRank < change.oldRank ? ' 📈' : ' 📉'}
                </Typography>
              );
            })}
          </Alert>
        </Fade>
      )}

      {/* Leaderboard Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size={compact ? "small" : "medium"}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Rank</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Solved</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Penalty</TableCell>
              
              {showProblemMatrix && problemLetters.map(letter => (
                <TableCell 
                  key={letter} 
                  sx={{ color: 'white', fontWeight: 600 }} 
                  align="center"
                  width="50px"
                >
                  {letter}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {displayTeams.map((teamData, index) => {
              const rankChange = getTeamRankingChange(teamData.teamId);
              const isCurrentTeam = showTeamHighlight && team?.teamName === teamData.teamName;
              
              return (
                <Slide 
                  key={teamData.teamId} 
                  direction="right" 
                  in 
                  timeout={300 + index * 50}
                >
                  <TableRow
                    hover
                    sx={{
                      bgcolor: isCurrentTeam ? 'primary.light' + '20' : 'transparent',
                      border: isCurrentTeam ? `2px solid ${theme.palette.primary.main}` : 'none',
                      '&:hover': {
                        bgcolor: isCurrentTeam ? 'primary.light' + '30' : 'action.hover',
                      },
                    }}
                  >
                    {/* Rank */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 30 }}>
                          {teamData.rank}
                        </Typography>
                        
                        {rankChange && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {rankChange.newRank < rankChange.oldRank ? (
                              <TrendingUp color="success" fontSize="small" />
                            ) : (
                              <TrendingDown color="error" fontSize="small" />
                            )}
                          </Box>
                        )}
                        
                        {teamData.rank <= 3 && (
                          <EmojiEvents 
                            sx={{ 
                              color: teamData.rank === 1 ? '#FFD700' : 
                                     teamData.rank === 2 ? '#C0C0C0' : '#CD7F32' 
                            }} 
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Team Name */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: isCurrentTeam ? 'primary.main' : 'grey.400',
                            fontSize: '0.8rem',
                          }}
                        >
                          {teamData.teamName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: isCurrentTeam ? 600 : 400,
                              color: isCurrentTeam ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {teamData.teamName}
                          </Typography>
                          {teamData.lastSubmissionTime && (
                            <Typography variant="caption" color="text.secondary">
                              Last: {formatDistanceToNow(new Date(teamData.lastSubmissionTime))} ago
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Problems Solved */}
                    <TableCell align="center">
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {teamData.problemsSolved}
                      </Typography>
                    </TableCell>

                    {/* Penalty Time */}
                    <TableCell align="center">
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {formatPenaltyTime(teamData.penaltyTime)}
                      </Typography>
                    </TableCell>

                    {/* Problem Status Matrix */}
                    {showProblemMatrix && problemLetters.map(letter => {
                      const problem = teamData.problems.find(p => p.problemLetter === letter);
                      if (!problem) {
                        return (
                          <TableCell key={letter} align="center">
                            <Remove sx={{ color: 'grey.400' }} />
                          </TableCell>
                        );
                      }

                      const statusInfo = getProblemStatusInfo(problem);
                      
                      return (
                        <TableCell key={letter} align="center">
                          <Tooltip title={statusInfo.tooltip}>
                            <Box sx={{ position: 'relative' }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: statusInfo.color,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {statusInfo.text}
                              </Typography>
                              {problem.firstToSolve && (
                                <Badge
                                  badgeContent="🥇"
                                  sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                  }}
                                />
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </Slide>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      {maxTeams && leaderboard.teams.length > maxTeams && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Showing top {maxTeams} of {leaderboard.teams.length} teams
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RealTimeLeaderboard;