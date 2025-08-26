/**
 * Submission Feed Display - Phase 2.5 Task 4
 * Real-time submission monitoring with statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Container,
  Stack,
  Paper,
} from '@mui/material';

interface Submission {
  id: number;
  team_name: string;
  problem_letter: string;
  problem_title: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error' | 'memory_limit_exceeded';
  submission_time: string;
  judged_at?: string;
  execution_time?: number;
  memory_used?: number;
  contest_name: string;
  verdict_details?: string;
}

interface SubmissionStats {
  submissions_per_minute: number;
  language_usage: { [key: string]: number };
  verdict_distribution: { [key: string]: number };
  average_judging_time: number;
  total_submissions_today: number;
  pending_count: number;
}

const SubmissionFeedDisplay: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    submissions_per_minute: 0,
    language_usage: {},
    verdict_distribution: {},
    average_judging_time: 0,
    total_submissions_today: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [contestFilter, setContestFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Fetch submissions and analytics in parallel
      const [submissionsResponse, statsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/admin/submissions/live?limit=50', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/submissions/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/submissions/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        if (submissionsData.success) {
          setSubmissions(submissionsData.data || []);
        }
      }

      if (statsResponse.ok && analyticsResponse.ok) {
        const [statsData, analyticsData] = await Promise.all([
          statsResponse.json(),
          analyticsResponse.json()
        ]);

        if (statsData.success && analyticsData.success) {
          setStats({
            submissions_per_minute: statsData.data.submissions_per_minute || 0,
            average_judging_time: statsData.data.average_judging_time || 0,
            total_submissions_today: statsData.data.total_submissions_today || 0,
            pending_count: statsData.data.pending_count || 0,
            language_usage: analyticsData.data.language_usage || {},
            verdict_distribution: analyticsData.data.verdict_distribution || {}
          });
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'pending': return 'info';
      case 'wrong_answer': return 'error';
      case 'compilation_error': return 'warning';
      case 'time_limit_exceeded': return 'secondary';
      case 'runtime_error': return 'error';
      case 'memory_limit_exceeded': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return '✓';
      case 'pending': return '🕰';
      case 'wrong_answer': return '×';
      case 'compilation_error': return '</>';
      case 'time_limit_exceeded': return '⏲';
      case 'runtime_error': return '×';
      case 'memory_limit_exceeded': return '💾';
      default: return '📊';
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'cpp': return '#00549d';
      case 'java': return '#f89820';
      case 'python': return '#3776ab';
      default: return '#666';
    }
  };

  const formatTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (contestFilter !== 'all' && sub.contest_name !== contestFilter) return false;
    if (languageFilter !== 'all' && sub.language !== languageFilter) return false;
    
    switch (selectedTab) {
      case 0: return true;
      case 1: return sub.status === 'pending';
      case 2: return sub.status === 'accepted';
      case 3: return sub.status !== 'pending' && sub.status !== 'accepted';
      default: return true;
    }
  });

  const uniqueContests = [...new Set(submissions.map(s => s.contest_name))];
  const uniqueLanguages = [...new Set(submissions.map(s => s.language))];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Real-time Submission Feed
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
            <Badge badgeContent={stats.pending_count} color="error">
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchSubmissions}>
                  ↻
                </IconButton>
              </Tooltip>
            </Badge>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ fontSize: 24, color: 'primary.main', mb: 1 }}>⏱</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats.submissions_per_minute.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per Minute
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ fontSize: 24, color: 'info.main', mb: 1 }}>📊</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats.total_submissions_today}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Today Total
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ fontSize: 24, color: 'secondary.main', mb: 1 }}>⏲</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats.average_judging_time.toFixed(1)}s
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg. Judge Time
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ fontSize: 24, color: 'warning.main', mb: 1 }}>🕰</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats.pending_count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Submission Feed */}
          <Box sx={{ flex: 2, minWidth: 0 }}>
            <Card>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
                  <Tab label={`All (${submissions.length})`} />
                  <Tab 
                    label={
                      <Badge badgeContent={submissions.filter(s => s.status === 'pending').length} color="error">
                        Pending
                      </Badge>
                    } 
                  />
                  <Tab label={`Accepted (${submissions.filter(s => s.status === 'accepted').length})`} />
                  <Tab label={`Rejected (${submissions.filter(s => s.status !== 'pending' && s.status !== 'accepted').length})`} />
                </Tabs>

                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Contest</InputLabel>
                    <Select
                      value={contestFilter}
                      label="Contest"
                      onChange={(e) => setContestFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      {uniqueContests.map(contest => (
                        <MenuItem key={contest} value={contest}>{contest}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={languageFilter}
                      label="Language"
                      onChange={(e) => setLanguageFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      {uniqueLanguages.map(lang => (
                        <MenuItem key={lang} value={lang}>{lang.toUpperCase()}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              <CardContent sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
                {loading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Team</TableCell>
                          <TableCell>Problem</TableCell>
                          <TableCell>Language</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Performance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                                  {submission.team_name.charAt(0)}
                                </Avatar>
                                <Typography variant="body2">
                                  {submission.team_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {submission.problem_letter}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {submission.problem_title}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={submission.language.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor: getLanguageColor(submission.language) + '20',
                                  color: getLanguageColor(submission.language),
                                  fontWeight: 600
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                startIcon={getStatusIcon(submission.status)}
                                label={submission.status.replace('_', ' ')}
                                color={getStatusColor(submission.status) as any}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(submission.submission_time)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {submission.execution_time !== undefined && (
                                <Box>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {submission.execution_time}ms
                                  </Typography>
                                  {submission.memory_used && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {(submission.memory_used / 1024).toFixed(1)}KB
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Statistics Panel */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              {/* Language Usage */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    <Typography component="span" sx={{ mr: 1, verticalAlign: 'middle' }}>🗺</Typography>
                    Language Usage
                  </Typography>
                  <List dense>
                    {Object.entries(stats.language_usage).map(([language, percentage]) => (
                      <ListItem key={language}>
                        <ListItemText
                          primary={language.toUpperCase()}
                          secondary={
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          }
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {percentage}%
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>

              {/* Verdict Distribution */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    <Typography component="span" sx={{ mr: 1, verticalAlign: 'middle' }}>📉</Typography>
                    Verdict Distribution
                  </Typography>
                  <List dense>
                    {Object.entries(stats.verdict_distribution).map(([verdict, percentage]) => (
                      <ListItem key={verdict}>
                        <ListItemText
                          primary={
                            <Chip
                              label={verdict.replace('_', ' ')}
                              color={getStatusColor(verdict) as any}
                              size="small"
                              sx={{ textTransform: 'capitalize', mr: 1 }}
                            />
                          }
                          secondary={
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              color={getStatusColor(verdict) as any}
                              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                            />
                          }
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {percentage}%
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
};

export default SubmissionFeedDisplay;