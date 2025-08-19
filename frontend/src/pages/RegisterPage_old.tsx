/**
 * CS Club Hackathon Platform - Team Registration Page
 * Phase 1.4: Team registration form with validation (CSS-based, removed MUI)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { RegisterFormData } from '../types';
import '../styles/theme.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    teamName: '',
    contestCode: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamName.trim()) {
      setError('Team name is required');
      return;
    }
    
    if (!formData.contestCode.trim()) {
      setError('Contest code is required');
      return;
    }

    if (formData.teamName.length < 3) {
      setError('Team name must be at least 3 characters long');
      return;
    }

    if (formData.teamName.length > 50) {
      setError('Team name must be less than 50 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.registerTeam(formData);
      
      if (response.success && response.data) {
        // Store auth token
        apiService.setAuthToken(response.data.token);
        
        setSuccess('Team registered successfully! Redirecting to dashboard...');
        
        // Redirect after short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        setError(err.response.data.details);
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: theme.palette.primary.light,
                color: 'white',
                mb: 2,
              }}
            >
              <Group sx={{ fontSize: 30 }} />
            </Box>
            
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Register Team
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Create your team account to participate in the hackathon
            </Typography>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Team Name"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              margin="normal"
              required
              disabled={isLoading || success !== null}
              placeholder="Enter your team name"
              helperText="3-50 characters, must be unique for the contest"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Contest Code"
              name="contestCode"
              value={formData.contestCode}
              onChange={handleChange}
              margin="normal"
              required
              disabled={isLoading || success !== null}
              placeholder="Enter the contest registration code"
              helperText="Provided by your contest organizer"
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || success !== null}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                position: 'relative',
              }}
            >
              {isLoading && (
                <CircularProgress
                  size={20}
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    marginLeft: '-10px',
                  }}
                />
              )}
              {isLoading ? 'Registering...' : 'Register Team'}
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have a team account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                sx={{
                  textDecoration: 'none',
                  color: theme.palette.primary.main,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Login here
              </Link>
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/')}
              sx={{
                textDecoration: 'none',
                color: theme.palette.text.secondary,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              ← Back to Home
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;