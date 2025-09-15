import React, { useEffect, useState, useMemo } from 'react';
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

  // Get problem status info
  const getProblemStatusInfo = (problem: ProblemStatus) => {
    if (problem.solved) {
      return {
        text: problem.totalPoints ? `${problem.pointsEarned || problem.totalPoints}` : 'SOLVED',
        className: 'status-solved',
        tooltip: `Fully solved: ${problem.pointsEarned || problem.totalPoints}/${problem.totalPoints || 1} points`,
      };
    } else if (problem.partialCredit && (problem.pointsEarned || 0) > 0) {
      const percentage = problem.totalTestCases ? 
        Math.round(((problem.testCasesPassed || 0) / problem.totalTestCases) * 100) : 0;
      return {
        text: `${problem.pointsEarned || 0}/${problem.totalPoints || 1}`,
        className: 'status-partial',
        tooltip: `Partial credit: ${problem.testCasesPassed || 0}/${problem.totalTestCases || 0} test cases (${percentage}%)`,
      };
    } else if (problem.attempts > 0) {
      return {
        text: `0/${problem.totalPoints || 1}`,
        className: 'status-failed',
        tooltip: `${problem.attempts} failed attempts - 0 points earned`,
      };
    } else {
      return {
        text: '—',
        className: 'status-unattempted',
        tooltip: 'Not attempted',
      };
    }
  };

  // Format points with thousands separator
  const formatPoints = (points: number): string => {
    return points.toLocaleString();
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
      <div className="alert alert-info">
        Leaderboard is frozen. Rankings will be revealed after the contest ends.
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-content">
          {isConnected ? (
            <>
              <div className="loading-bar"></div>
              <p>Loading leaderboard...</p>
            </>
          ) : (
            <>
              <p>Leaderboard not available</p>
              <ConnectionStatus compact />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-left">
          <h2 className="leaderboard-title">
            Live Leaderboard
            {leaderboard.isFrozen && (
              <span className="frozen-badge">FROZEN</span>
            )}
          </h2>
          
          {isRefreshing && <div className="refresh-indicator"></div>}
        </div>

        <div className="header-right">
          {showLastUpdate && lastLeaderboardUpdate && (
            <span className="last-update">
              Updated {formatDistanceToNow(lastLeaderboardUpdate)} ago
            </span>
          )}
          
          <ConnectionStatus compact />
          
          <button 
            className="toggle-changes-btn"
            onClick={() => setShowRankingChanges(!showRankingChanges)}
            title={showRankingChanges ? "Hide ranking changes" : "Show ranking changes"}
          >
            {showRankingChanges ? 'Hide Changes' : 'Show Changes'}
          </button>
        </div>
      </div>

      {/* Ranking Changes Alert */}
      {showRankingChanges && rankingChanges.length > 0 && (
        <div className="ranking-changes-alert">
          <div className="alert-header">
            <strong>Recent Ranking Changes:</strong>
            <button 
              className="close-btn"
              onClick={() => setRankingChanges([])}
            >
              ×
            </button>
          </div>
          {rankingChanges.slice(0, 3).map((change, index) => {
            const team = leaderboard.teams.find(t => t.teamId === change.teamId);
            if (!team) return null;
            
            return (
              <div key={index} className="ranking-change">
                {team.teamName}: #{change.oldRank} → #{change.newRank}
                <span className={change.newRank < change.oldRank ? 'rank-up' : 'rank-down'}>
                  {change.newRank < change.oldRank ? ' ↗' : ' ↘'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-table-container">
        <table className={`leaderboard-table ${compact ? 'compact' : ''}`}>
          <thead>
            <tr className="table-header">
              <th>Rank</th>
              <th>Team</th>
              <th className="text-center">Solved</th>
              <th className="text-center">Points</th>
              
              {showProblemMatrix && problemLetters.map(letter => (
                <th key={letter} className="text-center problem-header">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {displayTeams.map((teamData, index) => {
              const rankChange = getTeamRankingChange(teamData.teamId);
              const isCurrentTeam = showTeamHighlight && team?.teamName === teamData.teamName;
              
              return (
                <tr
                  key={teamData.teamId}
                  className={`team-row ${isCurrentTeam ? 'current-team' : ''}`}
                >
                  {/* Rank */}
                  <td className="rank-cell">
                    <div className="rank-container">
                      <span className="rank-number">{teamData.rank}</span>
                      
                      {rankChange && (
                        <span className={`rank-change ${rankChange.newRank < rankChange.oldRank ? 'rank-up' : 'rank-down'}`}>
                          {rankChange.newRank < rankChange.oldRank ? '↗' : '↘'}
                        </span>
                      )}
                      
                      {teamData.rank <= 3 && (
                        <span className={`trophy rank-${teamData.rank}`}>
                          TROPHY
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Team Name */}
                  <td className="team-cell">
                    <div className="team-info">
                      <div className={`team-avatar ${isCurrentTeam ? 'current' : ''}`}>
                        {teamData.teamName.charAt(0).toUpperCase()}
                      </div>
                      <div className="team-details">
                        <div className={`team-name ${isCurrentTeam ? 'current' : ''}`}>
                          {teamData.teamName}
                        </div>
                        {teamData.lastSubmissionTime && (
                          <div className="last-submission">
                            Last: {formatDistanceToNow(new Date(teamData.lastSubmissionTime))} ago
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Problems Solved */}
                  <td className="text-center solved-cell">
                    <span className="problems-solved">
                      {teamData.problemsSolved}
                    </span>
                  </td>

                  {/* Total Points */}
                  <td className="text-center points-cell">
                    <span className="total-points">
                      {formatPoints(teamData.totalPoints || 0)}
                    </span>
                  </td>

                  {/* Problem Status Matrix */}
                  {showProblemMatrix && problemLetters.map(letter => {
                    const problem = teamData.problems.find(p => p.problemLetter === letter);
                    if (!problem) {
                      return (
                        <td key={letter} className="text-center problem-cell">
                          <span className="status-unattempted">—</span>
                        </td>
                      );
                    }

                    const statusInfo = getProblemStatusInfo(problem);
                    
                    return (
                      <td key={letter} className="text-center problem-cell">
                        <div 
                          className="problem-status-container"
                          title={statusInfo.tooltip}
                        >
                          <span className={`problem-status ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                          {problem.firstToSolve && (
                            <span className="first-solve-badge">1st</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {maxTeams && leaderboard.teams.length > maxTeams && (
        <div className="leaderboard-footer">
          <span className="teams-count">
            Showing top {maxTeams} of {leaderboard.teams.length} teams
          </span>
        </div>
      )}
    </div>
  );
};

export default RealTimeLeaderboard;