/**
 * CS Club Hackathon Platform - Create Contest Page
 * Phase 2.3: Contest creation interface
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  Save,
  Schedule,
  Timer,
} from '@mui/icons-material';
// Using native HTML datetime-local input for simplicity
import { useAdminAuth } from '../hooks/useAdminAuth';
import apiService from '../services/api';

interface ContestFormData {
  contest_name: string;
  description: string;
  start_time: string;
  duration: number;
  freeze_time: number;
  is_active: boolean;
  is_registration_open: boolean;
}

const CreateContestPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [formData, setFormData] = useState<ContestFormData>({
    contest_name: '',
    description: '',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default: 2 hours from now
    duration: 180, // Default: 3 hours
    freeze_time: 30, // Default: 30 minutes before end
    is_active: true,
    is_registration_open: true,
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' },
  ];

  const freezeTimeOptions = [
    { value: 0, label: 'No freeze' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
  ];

  const handleChange = (field: keyof ContestFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) setErrors([]);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.contest_name.trim()) {
      newErrors.push('Contest name is required');
    } else if (formData.contest_name.trim().length < 3) {
      newErrors.push('Contest name must be at least 3 characters long');
    }

    if (!formData.description.trim()) {
      newErrors.push('Contest description is required');
    } else if (formData.description.trim().length < 10) {
      newErrors.push('Contest description must be at least 10 characters long');
    }

    if (!formData.start_time) {
      newErrors.push('Start time is required');
    } else if (new Date(formData.start_time) <= new Date()) {
      newErrors.push('Start time must be in the future');
    }

    if (formData.duration < 30) {
      newErrors.push('Contest duration must be at least 30 minutes');
    }

    if (formData.freeze_time > formData.duration) {
      newErrors.push('Freeze time cannot be longer than contest duration');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const contestData = {
        contest_name: formData.contest_name.trim(),
        description: formData.description.trim(),
        start_time: new Date(formData.start_time).toISOString(),
        duration: formData.duration,
        freeze_time: formData.freeze_time,
        is_active: formData.is_active,
        is_registration_open: formData.is_registration_open,
      };

      const response = await apiService.createContest(contestData);
      
      if (response.success) {
        setSuccess(`Contest "${response.data.contest_name}" created successfully! Registration code: ${response.data.registration_code}`);
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 3000);
      } else {
        setErrors([response.message || 'Failed to create contest']);
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to create contest']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <EmojiEvents sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Create New Contest
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Admin: {admin?.username}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Contest Details
            </Typography>

            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* Error Alerts */}
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
                {/* Contest Name */}
                <TextField
                  fullWidth
                  label="Contest Name"
                  value={formData.contest_name}
                  onChange={(e) => handleChange('contest_name', e.target.value)}
                  placeholder="e.g., Fall 2025 Programming Contest"
                  disabled={isLoading}
                  helperText="This will be displayed to participants"
                />

                {/* Description */}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the contest, rules, and any special instructions..."
                  disabled={isLoading}
                  helperText="Provide details about the contest for participants"
                />

                {/* Start Time and Duration */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => handleChange('start_time', e.target.value)}
                    disabled={isLoading}
                    helperText="When the contest begins"
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={formData.duration}
                      onChange={(e) => handleChange('duration', e.target.value as number)}
                      disabled={isLoading}
                      label="Duration"
                    >
                      {durationOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Timer sx={{ mr: 1, fontSize: 20 }} />
                            {option.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>How long the contest runs</FormHelperText>
                  </FormControl>
                </Box>

                {/* Freeze Time */}
                <FormControl fullWidth>
                  <InputLabel>Freeze Time</InputLabel>
                  <Select
                    value={formData.freeze_time}
                    onChange={(e) => handleChange('freeze_time', e.target.value as number)}
                    disabled={isLoading}
                    label="Freeze Time"
                  >
                    {freezeTimeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Schedule sx={{ mr: 1, fontSize: 20 }} />
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Scoreboard freeze before contest end (ICPC style)</FormHelperText>
                </FormControl>

                {/* Submit Button */}
                <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/dashboard')}
                    disabled={isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                    disabled={isLoading}
                    sx={{ 
                      minWidth: 150,
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Create Contest'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default CreateContestPage;