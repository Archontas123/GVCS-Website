
import React, { useEffect, useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeData } from '../../hooks/useWebSocket';
import { SubmissionStatusUpdate } from '../../services/websocket';
import { useAuth } from '../../hooks/useAuth';
import SubmissionDetailModal from './SubmissionDetailModal';
import '../../styles/theme.css';

interface RealTimeSubmissionsProps {
  contestId?: number;
  teamId?: number;
  problemId?: number;
  maxSubmissions?: number;
  showAllTeams?: boolean;
  showOnlyRecent?: boolean;
  autoScroll?: boolean;
  showFilters?: boolean;
}

interface SubmissionDisplay extends SubmissionStatusUpdate {
  teamName?: string;
  problemLetter?: string;
  language?: string;
  submissionTime?: string;
  codePreview?: string;
}

const RealTimeSubmissions: React.FC<RealTimeSubmissionsProps> = ({
  contestId,
  teamId,
  problemId,
  maxSubmissions = 50,
  showAllTeams = false,
  showOnlyRecent = true,
  autoScroll = true,
  showFilters = false,
}) => {
  const { team } = useAuth();
  const { submissionUpdates, isConnected } = useRealTimeData(contestId);
  
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDisplay | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [showFiltersExpanded, setShowFiltersExpanded] = useState(false);
  const [teamNames, setTeamNames] = useState<Map<number, string>>(new Map());
  const [problemInfo, setProblemInfo] = useState<Map<number, { letter: string; title?: string }>>(new Map());
  const [submissionDetails, setSubmissionDetails] = useState<Map<number, { language: string; submissionTime: string }>>(new Map());

  useEffect(() => {
    const fetchTeamInfo = async (teamId: number) => {
      if (!teamNames.has(teamId)) {
        try {
          const response = await fetch(`/api/teams/${teamId}`);
          if (response.ok) {
            const teamData = await response.json();
            setTeamNames(prev => new Map(prev.set(teamId, teamData.data?.teamName || `Team ${teamId}`)));
          }
        } catch (error) {
          console.error('Failed to fetch team info:', error);
          setTeamNames(prev => new Map(prev.set(teamId, `Team ${teamId}`)));
        }
      }
    };

    const fetchProblemInfo = async (problemId: number) => {
      if (!problemInfo.has(problemId)) {
        try {
          const response = await fetch(`/api/problems/${problemId}`);
          if (response.ok) {
            const problemData = await response.json();
            setProblemInfo(prev => new Map(prev.set(problemId, {
              letter: problemData.data?.problemLetter || String.fromCharCode(65 + (problemId - 1)),
              title: problemData.data?.title
            })));
          }
        } catch (error) {
          console.error('Failed to fetch problem info:', error);
          setProblemInfo(prev => new Map(prev.set(problemId, {
            letter: String.fromCharCode(65 + (problemId - 1))
          })));
        }
      }
    };

    const fetchSubmissionDetails = async (submissionId: number, teamId: number) => {
      if (!submissionDetails.has(submissionId)) {
        const canFetchDetails = showAllTeams || !team || teamId === team.id;
        
        if (canFetchDetails && team?.sessionToken) {
          try {
            const response = await fetch(`/api/submissions/${submissionId}/status`, {
              headers: {
                'Authorization': `Bearer ${team.sessionToken}`,
              }
            });
            if (response.ok) {
              const submissionData = await response.json();
              if (submissionData.success && submissionData.data) {
                setSubmissionDetails(prev => new Map(prev.set(submissionId, {
                  language: submissionData.data.language,
                  submissionTime: submissionData.data.submissionTime
                })));
                return;
              }
            }
          } catch (error) {
            console.error('Failed to fetch submission details:', error);
          }
        }
        
        setSubmissionDetails(prev => new Map(prev.set(submissionId, {
          language: getDefaultLanguage(),
          submissionTime: new Date().toISOString()
        })));
      }
    };

    const getDefaultLanguage = () => {
      const languages = Array.from(submissionDetails.values()).map(d => d.language);
      const languageCount = languages.reduce((acc, lang) => {
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommon = Object.entries(languageCount).sort((a, b) => b[1] - a[1])[0];
      return mostCommon ? mostCommon[0] : 'cpp';
    };

    submissionUpdates.forEach(submission => {
      fetchTeamInfo(submission.teamId);
      fetchProblemInfo(submission.problemId);
      fetchSubmissionDetails(submission.submissionId, submission.teamId);
    });
  }, [submissionUpdates, teamNames, problemInfo, submissionDetails, team?.sessionToken, showAllTeams]);


  const enrichedSubmissions = useMemo((): SubmissionDisplay[] => {
    return submissionUpdates.map(submission => {
      const details = submissionDetails.get(submission.submissionId);
      return {
        ...submission,
        teamName: teamNames.get(submission.teamId) || `Team ${submission.teamId}`,
        problemLetter: problemInfo.get(submission.problemId)?.letter || String.fromCharCode(65 + (submission.problemId - 1)),
        language: details?.language || 'unknown',
        submissionTime: details?.submissionTime || new Date().toISOString(),
      };
    });
  }, [submissionUpdates, teamNames, problemInfo, submissionDetails]);

  const judgingSubmissions = useMemo(() => {
    return new Set(
      enrichedSubmissions
        .filter(sub => sub.status === 'judging' || sub.status === 'pending')
        .map(sub => sub.submissionId)
    );
  }, [enrichedSubmissions]);


  const filteredSubmissions = useMemo(() => {
    let filtered = enrichedSubmissions;

    if (teamId) {
      filtered = filtered.filter(sub => sub.teamId === teamId);
    } else if (!showAllTeams && team) {
      filtered = filtered.filter(sub => sub.teamId === team.id);
    }

    if (problemId) {
      filtered = filtered.filter(sub => sub.problemId === problemId);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'judging') {
        filtered = filtered.filter(sub => sub.status === 'judging' || sub.status === 'pending');
      } else {
        filtered = filtered.filter(sub => sub.status === filterStatus);
      }
    }

    if (filterLanguage !== 'all') {
      filtered = filtered.filter(sub => sub.language === filterLanguage);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.submissionTime || 0).getTime();
      const timeB = new Date(b.submissionTime || 0).getTime();
      return timeB - timeA;
    });

    return filtered.slice(0, maxSubmissions);
  }, [enrichedSubmissions, teamId, showAllTeams, team, problemId, filterStatus, filterLanguage, maxSubmissions]);

  const getVerdictInfo = (submission: SubmissionDisplay) => {
    if (submission.status === 'pending') {
      return {
        icon: 'PENDING',
        color: '#6b7280',
        text: 'Pending',
        bgColor: '#f3f4f6',
      };
    } else if (submission.status === 'judging') {
      return {
        icon: 'JUDGING',
        color: '#1d4ed8',
        text: 'Judging...',
        bgColor: '#dbeafe',
      };
    } else {
      switch (submission.verdict) {
        case 'Accepted':
          return {
            icon: 'AC',
            color: '#16a34a',
            text: 'Accepted',
            bgColor: '#dcfce7',
          };
        case 'Wrong Answer':
          return {
            icon: 'WA',
            color: '#dc2626',
            text: 'Wrong Answer',
            bgColor: '#fef2f2',
          };
        case 'Time Limit Exceeded':
          return {
            icon: 'TLE',
            color: '#d97706',
            text: 'Time Limit Exceeded',
            bgColor: '#fef3c7',
          };
        case 'Memory Limit Exceeded':
          return {
            icon: 'MLE',
            color: '#d97706',
            text: 'Memory Limit Exceeded',
            bgColor: '#fef3c7',
          };
        case 'Runtime Error':
          return {
            icon: 'RTE',
            color: '#7c2d12',
            text: 'Runtime Error',
            bgColor: '#fed7aa',
          };
        case 'Compilation Error':
          return {
            icon: 'CE',
            color: '#1d4ed8',
            text: 'Compilation Error',
            bgColor: '#dbeafe',
          };
        default:
          return {
            icon: 'UNK',
            color: '#6b7280',
            text: submission.verdict || 'Unknown',
            bgColor: '#f3f4f6',
          };
      }
    }
  };

  const getLanguageInfo = (language?: string) => {
    switch (language) {
      case 'cpp':
        return { name: 'C++', color: '#1d4ed8' };
      case 'java':
        return { name: 'Java', color: '#d97706' };
      case 'python':
        return { name: 'Python', color: '#16a34a' };
      default:
        return { name: language?.toUpperCase() || 'Unknown', color: '#6b7280' };
    }
  };

  if (!isConnected) {
    return (
      <div className="container">
        <div className="alert alert-warning">
          Real-time submission updates are not available. Please check your connection.
        </div>
        <div className="text-center p-4">
          <div className="text-muted mb-3">
            Attempting to connect to real-time updates...
          </div>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex justify-between align-center mb-3">
        <div className="flex align-center">
          <h3 style={{ margin: 0, marginRight: '12px' }}>
            Real-time Submissions
          </h3>
          {judgingSubmissions.size > 0 && (
            <span 
              className="chip chip-info" 
              style={{ fontSize: '12px' }}
            >
              {judgingSubmissions.size} judging
            </span>
          )}
        </div>

        {showFilters && (
          <button 
            className="btn btn-text"
            onClick={() => setShowFiltersExpanded(!showFiltersExpanded)}
          >
            {showFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
          </button>
        )}
      </div>

      {showFilters && showFiltersExpanded && (
        <div className="card mb-3">
          <div className="card-content">
            <h5 style={{ marginBottom: '12px' }}>Filters</h5>
            <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-outlined'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setFilterStatus('all')}
              >
                All Status
              </button>
              <button
                className={`btn ${filterStatus === 'judging' ? 'btn-primary' : 'btn-outlined'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setFilterStatus('judging')}
              >
                Judging
              </button>
              <button
                className={`btn ${filterStatus === 'judged' ? 'btn-primary' : 'btn-outlined'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setFilterStatus('judged')}
              >
                Judged
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <table className="table">
          <thead style={{ backgroundColor: 'var(--primary-main)' }}>
            <tr>
              <th style={{ color: 'white' }}>Time</th>
              {showAllTeams && <th style={{ color: 'white' }}>Team</th>}
              <th style={{ color: 'white' }}>Problem</th>
              <th style={{ color: 'white' }}>Language</th>
              <th style={{ color: 'white' }}>Status</th>
              <th style={{ color: 'white' }}>Time</th>
              <th style={{ color: 'white' }}>Memory</th>
              <th style={{ color: 'white' }}>Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={showAllTeams ? 8 : 7} className="text-center" style={{ padding: '48px 24px' }}>
                  <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <h5 className="text-muted" style={{ marginBottom: '8px' }}>Waiting for submissions</h5>
                    <p className="text-muted" style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>
                      {submissionUpdates.length === 0 
                        ? 'No submissions have been made yet. Start coding to see live updates here!'
                        : 'No submissions match the current filters.'
                      }
                    </p>
                    {contestId && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Contest ID: {contestId} | Connected to real-time updates
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission, index) => {
                const verdictInfo = getVerdictInfo(submission);
                const languageInfo = getLanguageInfo(submission.language);
                const isJudging = submission.status === 'judging' || submission.status === 'pending';
                
                return (
                  <tr 
                    key={submission.submissionId}
                    style={{ backgroundColor: verdictInfo.bgColor, cursor: 'pointer' }}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                      <td>
                        <div className="text-muted" style={{ fontSize: '13px' }}>
                          {submission.submissionTime ? 
                            formatDistanceToNow(new Date(submission.submissionTime)) + ' ago' :
                            'Unknown'
                          }
                        </div>
                      </td>

                      {showAllTeams && (
                        <td>
                          <div style={{ fontWeight: '500' }}>
                            {submission.teamName || `Team ${submission.teamId}`}
                          </div>
                        </td>
                      )}

                      <td>
                        <span 
                          className="chip" 
                          style={{ 
                            backgroundColor: '#f5f5f5', 
                            color: 'var(--text-primary)', 
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {submission.problemLetter || `P${submission.problemId}`}
                        </span>
                      </td>

                      <td>
                        <span 
                          className="chip"
                          style={{
                            backgroundColor: languageInfo.color + '20',
                            color: languageInfo.color,
                            border: `1px solid ${languageInfo.color}`,
                          }}
                        >
                          {languageInfo.name}
                        </span>
                      </td>

                      <td>
                        <div className="flex align-center" style={{ gap: '8px' }}>
                          <span 
                            style={{ 
                              color: verdictInfo.color, 
                              fontSize: '12px', 
                              fontWeight: 'bold'
                            }}
                          >
                            {verdictInfo.icon}
                          </span>
                          <span 
                            style={{ 
                              color: verdictInfo.color, 
                              fontWeight: '500', 
                              fontSize: '13px'
                            }}
                          >
                            {verdictInfo.text}
                          </span>
                          {isJudging && (
                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="text-muted" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {submission.executionTime ? `${submission.executionTime}ms` : '-'}
                        </div>
                      </td>

                      <td>
                        <div className="text-muted" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {submission.memoryUsed ? `${Math.round(submission.memoryUsed / 1024)}KB` : '-'}
                        </div>
                      </td>

                      <td>
                        <button
                          className="btn btn-text"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubmission(submission);
                          }}
                          title="View Details"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />

      <div className="text-center mt-3">
        <div className="text-muted" style={{ fontSize: '12px' }}>
          Showing {filteredSubmissions.length} submissions | Updates in real-time
        </div>
      </div>
    </div>
  );
};

export default RealTimeSubmissions;
