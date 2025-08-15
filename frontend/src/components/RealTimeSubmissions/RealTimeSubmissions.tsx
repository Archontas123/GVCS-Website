/**
 * CS Club Hackathon Platform - Real-time Submissions Component
 * Phase 5.5: Live submission status updates with judging progress
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
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Card,
  CardContent,
  Badge,
  useTheme,
  Fade,
  Collapse,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Cancel,
  Schedule,
  Memory,
  Error as ErrorIcon,
  Warning,
  Code,
  Visibility,
  Refresh,
  Timer,
  Speed,
  FilterList,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeData, useSubmissionTracking } from '../../hooks/useWebSocket';
import { SubmissionStatusUpdate } from '../../services/websocket';
import { useAuth } from '../../hooks/useAuth';

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
  const theme = useTheme();
  const { team } = useAuth();
  const { submissionUpdates, isConnected } = useRealTimeData(contestId);
  
  const [submissions, setSubmissions] = useState<SubmissionDisplay[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDisplay | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [showFiltersExpanded, setShowFiltersExpanded] = useState(false);
  const [judgingSubmissions, setJudgingSubmissions] = useState<Set<number>>(new Set());

  // Mock data for demo (in real implementation, this would come from WebSocket)
  const mockSubmissions: SubmissionDisplay[] = [
    {
      submissionId: 1,
      teamId: team?.id || 1,
      problemId: 1,
      status: 'judged',
      verdict: 'Accepted',
      executionTime: 45,
      memoryUsed: 1024,
      teamName: team?.teamName || 'Team Alpha',
      problemLetter: 'A',
      language: 'cpp',
      submissionTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      submissionId: 2,
      teamId: 2,
      problemId: 2,
      status: 'judging',
      teamName: 'Team Beta',
      problemLetter: 'B',
      language: 'java',
      submissionTime: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    },
    {
      submissionId: 3,
      teamId: 3,
      problemId: 1,
      status: 'judged',
      verdict: 'Wrong Answer',
      executionTime: 120,
      memoryUsed: 2048,
      teamName: 'Team Gamma',
      problemLetter: 'A',
      language: 'python',
      submissionTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    },
    {
      submissionId: 4,
      teamId: team?.id || 1,
      problemId: 3,
      status: 'pending',
      teamName: team?.teamName || 'Team Alpha',
      problemLetter: 'C',
      language: 'cpp',
      submissionTime: new Date(Date.now() - 30 * 1000).toISOString(),
    },
  ];

  // Initialize with mock data
  useEffect(() => {
    setSubmissions(mockSubmissions);
  }, [team]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSubmissions(prev => prev.map(sub => {
        // Simulate judging progress
        if (sub.status === 'pending') {
          return { ...sub, status: 'judging' };
        } else if (sub.status === 'judging' && Math.random() > 0.7) {
          const verdicts = ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'];
          const verdict = verdicts[Math.floor(Math.random() * verdicts.length)];
          return {
            ...sub,
            status: 'judged',
            verdict,
            executionTime: Math.floor(Math.random() * 1000) + 10,
            memoryUsed: Math.floor(Math.random() * 4000) + 512,
          };
        }
        return sub;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Track submissions that are being judged
  useEffect(() => {
    const judging = new Set(
      submissions
        .filter(sub => sub.status === 'judging' || sub.status === 'pending')
        .map(sub => sub.submissionId)
    );
    setJudgingSubmissions(judging);
  }, [submissions]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filter by team if specified
    if (teamId) {
      filtered = filtered.filter(sub => sub.teamId === teamId);
    } else if (!showAllTeams && team) {
      filtered = filtered.filter(sub => sub.teamId === team.id);
    }

    // Filter by problem if specified
    if (problemId) {
      filtered = filtered.filter(sub => sub.problemId === problemId);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'judging') {
        filtered = filtered.filter(sub => sub.status === 'judging' || sub.status === 'pending');
      } else {
        filtered = filtered.filter(sub => sub.status === filterStatus);
      }
    }

    // Filter by language
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(sub => sub.language === filterLanguage);
    }

    // Sort by submission time (newest first)
    filtered.sort((a, b) => {
      const timeA = new Date(a.submissionTime || 0).getTime();
      const timeB = new Date(b.submissionTime || 0).getTime();
      return timeB - timeA;
    });

    // Limit number of submissions
    return filtered.slice(0, maxSubmissions);
  }, [submissions, teamId, showAllTeams, team, problemId, filterStatus, filterLanguage, maxSubmissions]);

  // Get verdict display info
  const getVerdictInfo = (submission: SubmissionDisplay) => {
    if (submission.status === 'pending') {
      return {
        icon: <Schedule />,
        color: theme.palette.grey[500],
        text: 'Pending',
        bgColor: theme.palette.grey[100],
      };
    } else if (submission.status === 'judging') {
      return {
        icon: <PlayArrow />,
        color: theme.palette.info.main,
        text: 'Judging...',
        bgColor: theme.palette.info.light + '20',
      };
    } else {
      switch (submission.verdict) {
        case 'Accepted':
          return {
            icon: <CheckCircle />,
            color: theme.palette.success.main,
            text: 'Accepted',
            bgColor: theme.palette.success.light + '20',
          };
        case 'Wrong Answer':
          return {
            icon: <Cancel />,
            color: theme.palette.error.main,
            text: 'Wrong Answer',
            bgColor: theme.palette.error.light + '20',
          };
        case 'Time Limit Exceeded':
          return {
            icon: <Timer />,
            color: theme.palette.warning.main,
            text: 'Time Limit Exceeded',
            bgColor: theme.palette.warning.light + '20',
          };
        case 'Memory Limit Exceeded':
          return {
            icon: <Memory />,
            color: theme.palette.warning.main,
            text: 'Memory Limit Exceeded',
            bgColor: theme.palette.warning.light + '20',
          };
        case 'Runtime Error':
          return {
            icon: <ErrorIcon />,
            color: theme.palette.secondary.main,
            text: 'Runtime Error',
            bgColor: theme.palette.secondary.light + '20',
          };
        case 'Compilation Error':
          return {
            icon: <Code />,
            color: theme.palette.info.main,
            text: 'Compilation Error',
            bgColor: theme.palette.info.light + '20',
          };
        default:
          return {
            icon: <Warning />,
            color: theme.palette.grey[500],
            text: submission.verdict || 'Unknown',
            bgColor: theme.palette.grey[100],
          };
      }
    }
  };

  // Get language display info
  const getLanguageInfo = (language?: string) => {
    switch (language) {
      case 'cpp':
        return { name: 'C++', color: theme.palette.primary.main };
      case 'java':
        return { name: 'Java', color: theme.palette.warning.main };
      case 'python':
        return { name: 'Python', color: theme.palette.success.main };
      default:
        return { name: language?.toUpperCase() || 'Unknown', color: theme.palette.grey[500] };
    }
  };

  if (!isConnected) {
    return (
      <Alert severity="warning">
        Real-time submission updates are not available. Please check your connection.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed />
          Real-time Submissions
          {judgingSubmissions.size > 0 && (
            <Badge badgeContent={judgingSubmissions.size} color="primary">
              <PlayArrow />
            </Badge>
          )}
        </Typography>

        {showFilters && (
          <IconButton onClick={() => setShowFiltersExpanded(!showFiltersExpanded)}>
            {showFiltersExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Box>

      {/* Filters */}
      {showFilters && (
        <Collapse in={showFiltersExpanded}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Filters
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label="All Status"
                  variant={filterStatus === 'all' ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus('all')}
                  size="small"
                />
                <Chip
                  label="Judging"
                  variant={filterStatus === 'judging' ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus('judging')}
                  size="small"
                />
                <Chip
                  label="Judged"
                  variant={filterStatus === 'judged' ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus('judged')}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Collapse>
      )}

      {/* Submissions Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time</TableCell>
              {showAllTeams && (
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team</TableCell>
              )}
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Problem</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Language</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Memory</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {filteredSubmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showAllTeams ? 8 : 7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No submissions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSubmissions.map((submission, index) => {
                const verdictInfo = getVerdictInfo(submission);
                const languageInfo = getLanguageInfo(submission.language);
                const isJudging = submission.status === 'judging' || submission.status === 'pending';
                
                return (
                  <Fade key={submission.submissionId} in timeout={300 + index * 50}>
                    <TableRow
                      hover
                      sx={{
                        bgcolor: verdictInfo.bgColor,
                        '&:hover': { bgcolor: theme.palette.action.hover },
                      }}
                    >
                      {/* Submission Time */}
                      <TableCell>
                        <Typography variant="body2">
                          {submission.submissionTime ? 
                            formatDistanceToNow(new Date(submission.submissionTime)) + ' ago' :
                            'Unknown'
                          }
                        </Typography>
                      </TableCell>

                      {/* Team Name */}
                      {showAllTeams && (
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {submission.teamName || `Team ${submission.teamId}`}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Problem */}
                      <TableCell>
                        <Chip
                          label={submission.problemLetter || `P${submission.problemId}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>

                      {/* Language */}
                      <TableCell>
                        <Chip
                          label={languageInfo.name}
                          size="small"
                          sx={{
                            bgcolor: languageInfo.color + '20',
                            color: languageInfo.color,
                            border: `1px solid ${languageInfo.color}`,
                          }}
                        />
                      </TableCell>

                      {/* Status/Verdict */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: verdictInfo.color }}>
                            {verdictInfo.icon}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ color: verdictInfo.color, fontWeight: 500 }}
                          >
                            {verdictInfo.text}
                          </Typography>
                          {isJudging && (
                            <LinearProgress sx={{ width: 30, ml: 1, height: 4 }} />
                          )}
                        </Box>
                      </TableCell>

                      {/* Execution Time */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {submission.executionTime ? `${submission.executionTime}ms` : '—'}
                        </Typography>
                      </TableCell>

                      {/* Memory Used */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {submission.memoryUsed ? `${Math.round(submission.memoryUsed / 1024)}KB` : '—'}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </Fade>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submission Details Dialog */}
      <Dialog
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Submission Details
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submission ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    #{selectedSubmission.submissionId}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Problem
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedSubmission.problemLetter || `Problem ${selectedSubmission.problemId}`}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Language
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {getLanguageInfo(selectedSubmission.language).name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {getVerdictInfo(selectedSubmission).text}
                  </Typography>
                </Box>
                
                {selectedSubmission.executionTime && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Execution Time
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedSubmission.executionTime}ms
                    </Typography>
                  </Box>
                )}
                
                {selectedSubmission.memoryUsed && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Memory Used
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {Math.round(selectedSubmission.memoryUsed / 1024)}KB
                    </Typography>
                  </Box>
                )}
              </Box>

              {selectedSubmission.submissionTime && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submitted
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDistanceToNow(new Date(selectedSubmission.submissionTime))} ago
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedSubmission.submissionTime).toLocaleString()}
                    </Typography>
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSubmission(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {filteredSubmissions.length} submissions • Updates in real-time
        </Typography>
      </Box>
    </Box>
  );
};

export default RealTimeSubmissions;