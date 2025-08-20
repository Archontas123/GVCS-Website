import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import apiService from '../../services/api';

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  contest_name: string;
  contest_id: number;
}

interface AddProblemModalProps {
  open: boolean;
  onClose: () => void;
  contestId: number;
  onProblemAdded: () => void;
}

const AddProblemModal: React.FC<AddProblemModalProps> = ({
  open,
  onClose,
  contestId,
  onProblemAdded
}) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchProblems();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProblems(problems);
    } else {
      const filtered = problems.filter(problem =>
        problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.contest_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProblems(filtered);
    }
  }, [searchTerm, problems]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getAdminProblems();
      if (result.success && result.data) {
        setProblems(result.data);
      } else {
        throw new Error('Failed to fetch problems');
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
      setError(error instanceof Error ? error.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProblem = async (problemId: number) => {
    try {
      setCopyingId(problemId);
      setError(null);
      
      const result = await apiService.copyProblemToContest(contestId, problemId);
      if (result.success) {
        onProblemAdded();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to add problem to contest');
      }
    } catch (error) {
      console.error('Failed to copy problem:', error);
      setError(error instanceof Error ? error.message : 'Failed to add problem to contest');
    } finally {
      setCopyingId(null);
    }
  };

  const handleCreateNew = () => {
    onClose();
    navigate('/admin/problems/new');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'hard': return 'error';
      default: return 'warning';
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Add Problem to Contest
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Search problems by title or contest name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          size="small"
        />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Select an existing problem to add to this contest:
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : filteredProblems.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {searchTerm.trim() !== '' ? 'No problems found matching your search.' : 'No problems available.'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              sx={{ borderRadius: '8px' }}
            >
              Create New Problem
            </Button>
          </Box>
        ) : (
          <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
            {filteredProblems.map((problem, index) => (
              <React.Fragment key={problem.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleCopyProblem(problem.id)}
                    disabled={copyingId === problem.id}
                    sx={{ 
                      borderRadius: '8px', 
                      mb: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {problem.title}
                          </Typography>
                          <Chip
                            label={problem.difficulty}
                            color={getDifficultyColor(problem.difficulty)}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          From: {problem.contest_name}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      {copyingId === problem.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyProblem(problem.id);
                          }}
                          sx={{ 
                            borderRadius: '6px',
                            textTransform: 'none'
                          }}
                        >
                          Add
                        </Button>
                      )}
                    </ListItemSecondaryAction>
                  </ListItemButton>
                </ListItem>
                {index < filteredProblems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{ 
            borderRadius: '8px',
            textTransform: 'none'
          }}
        >
          Create New Problem
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddProblemModal;