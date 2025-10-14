import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { LeaderboardEntry } from '../types';

const LeaderboardPage: React.FC = () => {
  const { team } = useAuth();
  const navigate = useNavigate();
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
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div style={{
          fontFamily: "'Press Start 2P', cursive",
          minHeight: '100vh',
          backgroundColor: '#CECDE2',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{
            border: '4px solid #212529',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            borderTop: '4px solid #2D58A6',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{ fontSize: '0.8rem', color: '#212529' }}>Loading leaderboard...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div style={{
          fontFamily: "'Press Start 2P', cursive",
          minHeight: '100vh',
          backgroundColor: '#CECDE2',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            background: 'white',
            border: '4px solid #212529',
            boxShadow: '8px 8px 0px #212529',
            padding: '2rem',
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                padding: '1rem 1.5rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!contestId) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div style={{
          fontFamily: "'Press Start 2P', cursive",
          minHeight: '100vh',
          backgroundColor: '#CECDE2',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            background: 'white',
            border: '4px solid #212529',
            boxShadow: '8px 8px 0px #212529',
            padding: '2rem',
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#212529', marginBottom: '1rem' }}>No active contest found</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                padding: '1rem 1.5rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </>
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
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        fontFamily: "'Press Start 2P', cursive",
        minHeight: '100vh',
        backgroundColor: '#CECDE2',
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
        backgroundSize: '30px 30px',
        padding: '2rem 1rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            background: '#2D58A6',
            border: '4px solid #212529',
            boxShadow: '6px 6px 0px #212529',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <h2 style={{
              margin: 0,
              color: 'white',
              fontSize: 'clamp(1rem, 3vw, 1.8rem)',
              textShadow: '4px 4px 0px #212529',
            }}>
              Leaderboard
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {lastUpdate && (
                <span style={{
                  fontSize: '0.6rem',
                  color: 'white',
                  textShadow: '2px 2px 0px #212529',
                }}>
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => navigate(-1)}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: 'white',
                  color: '#212529',
                  padding: '0.8rem 1.2rem',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0px #212529',
                  fontFamily: "'Press Start 2P', cursive",
                  transition: 'all 0.15s',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(4px, 4px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                }}
              >
                ← Back
              </button>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div style={{
              background: 'white',
              border: '4px solid #212529',
              boxShadow: '6px 6px 0px #212529',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#212529', margin: 0 }}>
                No teams have submitted solutions yet.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                background: 'white',
                border: '4px solid #212529',
                boxShadow: '6px 6px 0px #212529',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '0.7rem',
              }}>
                <thead>
                  <tr style={{ background: '#2D58A6', color: 'white' }}>
                    <th style={{
                      padding: '1rem',
                      border: '2px solid #212529',
                      textAlign: 'left',
                      textShadow: '2px 2px 0px #212529',
                    }}>Rank</th>
                    <th style={{
                      padding: '1rem',
                      border: '2px solid #212529',
                      textAlign: 'left',
                      textShadow: '2px 2px 0px #212529',
                    }}>Team</th>
                    <th style={{
                      padding: '1rem',
                      border: '2px solid #212529',
                      textAlign: 'center',
                      textShadow: '2px 2px 0px #212529',
                    }}>Solved</th>
                    <th style={{
                      padding: '1rem',
                      border: '2px solid #212529',
                      textAlign: 'center',
                      textShadow: '2px 2px 0px #212529',
                    }}>Points</th>
                    {uniqueProblems.map(letter => (
                      <th key={letter} style={{
                        padding: '1rem',
                        border: '2px solid #212529',
                        textAlign: 'center',
                        minWidth: '80px',
                        textShadow: '2px 2px 0px #212529',
                      }}>{letter}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const isCurrentTeam = team?.teamName === entry.teamName;
                    return (
                      <tr
                        key={index}
                        style={{
                          background: isCurrentTeam ? '#FFF4CC' : index % 2 === 0 ? 'white' : '#f9fafb',
                        }}
                      >
                        <td style={{
                          padding: '1rem',
                          border: '2px solid #212529',
                        }}>
                          <strong style={{ color: entry.rank <= 3 ? '#2D58A6' : '#212529' }}>
                            #{entry.rank}
                          </strong>
                        </td>
                        <td style={{
                          padding: '1rem',
                          border: '2px solid #212529',
                        }}>
                          <div style={{ fontWeight: isCurrentTeam ? 'bold' : 'normal' }}>
                            {entry.teamName}
                          </div>
                          {entry.lastSubmissionTime && (
                            <div style={{ fontSize: '0.55rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {new Date(entry.lastSubmissionTime).toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '1rem',
                          border: '2px solid #212529',
                          textAlign: 'center',
                        }}>
                          <span style={{
                            background: '#D4F1D4',
                            border: '2px solid #212529',
                            padding: '0.5rem 0.8rem',
                            display: 'inline-block',
                            minWidth: '40px',
                          }}>
                            {entry.problemsSolved}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem',
                          border: '2px solid #212529',
                          textAlign: 'center',
                        }}>
                          <span style={{
                            background: '#E8F0FE',
                            border: '2px solid #212529',
                            padding: '0.5rem 0.8rem',
                            display: 'inline-block',
                            minWidth: '60px',
                          }}>
                            {formatPoints(entry.totalPoints)}
                          </span>
                        </td>
                        {uniqueProblems.map(letter => {
                          const problem = entry.problems?.find(p => p.problemLetter === letter);
                          if (!problem) {
                            return (
                              <td key={letter} style={{
                                padding: '1rem',
                                border: '2px solid #212529',
                                textAlign: 'center',
                                color: '#9ca3af',
                              }}>
                                —
                              </td>
                            );
                          }

                          const status = getProblemStatus(problem);
                          let bgColor = 'transparent';
                          if (problem.solved) bgColor = '#D4F1D4';
                          else if (problem.attempts > 0 && problem.pointsEarned > 0) bgColor = '#FFF4CC';
                          else if (problem.attempts > 0) bgColor = '#FFCCCC';

                          return (
                            <td key={letter} style={{
                              padding: '1rem',
                              border: '2px solid #212529',
                              textAlign: 'center',
                              background: bgColor,
                            }}>
                              <span title={status.title} style={{ cursor: 'help' }}>
                                {problem.solved ? '✓' : problem.pointsEarned > 0 ? problem.pointsEarned : problem.attempts > 0 ? '✗' : '—'}
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
    </>
  );
};

export default LeaderboardPage;