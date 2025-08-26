import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { LeaderboardEntry } from '../types';
import '../styles/theme.css';

const LeaderboardPage: React.FC = () => {
  const { team } = useAuth();
  const [contestId, setContestId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchContestId = async () => {
      if (!team?.contestCode) {
        setError('No contest code available');
        setLoading(false);
        return;
      }

      try {
        const response = await apiService.getContestTimer(team.contestCode);
        
        if (response.success && response.data?.contest?.id) {
          setContestId(response.data.contest.id);
        } else {
          setError('Contest not found');
        }
      } catch (err: any) {
        console.error('Error fetching contest ID:', err);
        setError('Failed to load contest information');
      } finally {
        setLoading(false);
      }
    };

    fetchContestId();
  }, [team?.contestCode]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!contestId) return;

      try {
        const response = await apiService.getLeaderboard(contestId);
        if (response.success && response.data?.leaderboard) {
          setLeaderboard(response.data.leaderboard);
          setLastUpdate(new Date());
        }
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
      }
    };

    if (contestId) {
      fetchLeaderboard();
      const interval = setInterval(fetchLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [contestId]);

  if (loading) {
    return (
      <div className="container p-4">
        <div className="text-center">
          <div className="spinner spinner-lg"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-4">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!contestId) {
    return (
      <div className="container p-4">
        <div className="alert alert-warning">
          No active contest found
        </div>
      </div>
    );
  }

  const formatPoints = (points: number): string => {
    return points.toLocaleString();
  };

  const getProblemStatus = (problem: any) => {
    if (problem.solved) {
      return {
        className: 'text-success fw-bold',
        text: problem.firstToSolve ? `${problem.pointsEarned} (FIRST)` : `${problem.pointsEarned}`,
        title: `Solved: ${problem.pointsEarned}/${problem.totalPoints} points with ${problem.attempts} attempts`
      };
    } else if (problem.attempts > 0 && problem.pointsEarned > 0) {
      return {
        className: 'text-warning fw-bold',
        text: `${problem.pointsEarned}`,
        title: `Partial credit: ${problem.pointsEarned}/${problem.totalPoints} points from ${problem.attempts} attempts`
      };
    } else if (problem.attempts > 0) {
      return {
        className: 'text-danger',
        text: `0`,
        title: `${problem.attempts} failed attempts, 0 points earned`
      };
    } else {
      return {
        className: 'text-muted',
        text: '—',
        title: 'Not attempted'
      };
    }
  };

  const uniqueProblems = leaderboard.length > 0 
    ? leaderboard[0].problems?.map(p => p.problemLetter).sort() || []
    : [];

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      <div className="container p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Live Leaderboard</h2>
          {lastUpdate && (
            <small className="text-muted">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </small>
          )}
        </div>

        {leaderboard.length === 0 ? (
          <div className="alert alert-info">
            No teams have submitted solutions yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th className="text-center">Solved</th>
                  <th className="text-center">Points</th>
                  {uniqueProblems.map(letter => (
                    <th key={letter} className="text-center" style={{ minWidth: '60px' }}>
                      {letter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const isCurrentTeam = team?.teamName === entry.teamName;
                  return (
                    <tr 
                      key={index} 
                      className={isCurrentTeam ? 'table-primary' : ''}
                    >
                      <td>
                        <div className="d-flex align-items-center">
                          <strong>#{entry.rank}</strong>
                          {entry.rank <= 3 && (
                            <span className="ms-2">
                              {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center me-2"
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: isCurrentTeam ? '#0d6efd' : '#6c757d',
                              color: 'white',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {entry.teamName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={isCurrentTeam ? 'fw-bold text-primary' : ''}>
                              {entry.teamName}
                            </div>
                            {entry.lastSubmissionTime && (
                              <small className="text-muted">
                                Last: {new Date(entry.lastSubmissionTime).toLocaleTimeString()}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-success fs-6">
                          {entry.problemsSolved}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-primary fs-6">
                          {formatPoints(entry.totalPoints)}
                        </span>
                      </td>
                      {uniqueProblems.map(letter => {
                        const problem = entry.problems?.find(p => p.problemLetter === letter);
                        if (!problem) {
                          return (
                            <td key={letter} className="text-center text-muted">
                              —
                            </td>
                          );
                        }
                        
                        const status = getProblemStatus(problem);
                        return (
                          <td key={letter} className="text-center">
                            <span 
                              className={status.className}
                              title={status.title}
                              style={{ fontSize: '0.85rem', cursor: 'help' }}
                            >
                              {status.text}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;