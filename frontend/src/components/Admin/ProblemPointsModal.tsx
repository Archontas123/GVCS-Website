import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  Divider
} from '@mui/material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

interface ProblemPointsModalProps {
  open: boolean;
  onClose: () => void;
  problem: {
    id: number;
    title: string;
    max_points?: number;
  } | null;
  onUpdate: () => void;
}

interface ScoringStats {
  problemId: number;
  problemTitle: string;
  maxPoints: number;
  totalTestCases: number;
  sampleTestCases: number;
  scoringTestCases: number;
  pointsPerScoringTestCase: number;
  submissions: {
    total: number;
    fullPoints: number;
    partialPoints: number;
    zeroPoints: number;
    averageScore: string;
  };
}

const ProblemPointsModal: React.FC<ProblemPointsModalProps> = ({
  open,
  onClose,
  problem,
  onUpdate
}) => {
  const [maxPoints, setMaxPoints] = useState(100);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<ScoringStats | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (problem) {
      setMaxPoints(problem.max_points || 100);
      if (open) {
        loadScoringStats();
      }
    }
  }, [problem, open]);

  const loadScoringStats = async () => {
    if (!problem) return;
    
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `/api/admin/problems/${problem.id}/scoring-stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load scoring stats:', error);
      enqueueSnackbar('Failed to load scoring statistics', { variant: 'error' });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || maxPoints < 1 || maxPoints > 1000) {
      enqueueSnackbar('Max points must be between 1 and 1000', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `/api/admin/problems/${problem.id}/points`,
        { max_points: maxPoints },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      enqueueSnackbar('Problem points updated successfully', { variant: 'success' });
      onUpdate();
      loadScoringStats(); // Reload stats
    } catch (error: any) {
      console.error('Failed to update problem points:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to update problem points', 
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStats(null);
    onClose();
  };

  if (!problem) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Manage Points: {problem.title}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Point Configuration
                </Typography>
                <TextField
                  label="Maximum Points"
                  type="number"
                  fullWidth
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 1, max: 1000 }}
                  helperText="Points will be distributed equally among non-sample test cases"
                  margin="normal"
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Scoring System:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Sample test cases award 0 points</li>
                    <li>Non-sample test cases split the total points equally</li>
                    <li>Points are only awarded for passed test cases</li>
                  </ul>
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scoring Statistics
                  {loadingStats && " (Loading...)"}
                </Typography>
                
                {stats ? (
                  <Box>
                    <Typography variant="body2">
                      <strong>Current Max Points:</strong> {stats.maxPoints}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Test Cases:</strong> {stats.totalTestCases} total 
                      ({stats.sampleTestCases} sample, {stats.scoringTestCases} scoring)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Points per Test Case:</strong> {stats.pointsPerScoringTestCase}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Submission Performance:
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Submissions:</strong> {stats.submissions.total}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Full Points:</strong> {stats.submissions.fullPoints} submissions
                    </Typography>
                    <Typography variant="body2">
                      <strong>Partial Points:</strong> {stats.submissions.partialPoints} submissions
                    </Typography>
                    <Typography variant="body2">
                      <strong>Zero Points:</strong> {stats.submissions.zeroPoints} submissions
                    </Typography>
                    <Typography variant="body2">
                      <strong>Average Score:</strong> {stats.submissions.averageScore} points
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {loadingStats ? 'Loading statistics...' : 'No statistics available'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || maxPoints < 1 || maxPoints > 1000}
        >
          {loading ? 'Updating...' : 'Update Points'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProblemPointsModal;