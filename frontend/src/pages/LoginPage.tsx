/**
 * CS Club Hackathon Platform - Team Login Page
 * Phase 1.4: Team login form with authentication
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Link,
  useTheme,
} from '@mui/material';
import { Login } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { LoginFormData } from '../types';

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<LoginFormData>({
    teamName: '',
    contestCode: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.loginTeam(formData);
      
      if (response.success && response.data) {
        // Store auth token
        apiService.setAuthToken(response.data.token);
        
        // Redirect to dashboard
        navigate('/dashboard');
        
      } else {
        setError(response.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
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
                bgcolor: theme.palette.secondary.light,
                color: 'white',
                mb: 2,
              }}
            >
              <Login sx={{ fontSize: 30 }} />
            </Box>
            
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Team Login
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Access your team account to continue competing
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
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
              disabled={isLoading}
              placeholder="Enter your registered team name"
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
              disabled={isLoading}
              placeholder="Enter the contest code"
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
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
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have a team account yet?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                sx={{
                  textDecoration: 'none',
                  color: theme.palette.primary.main,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Register here
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

export default LoginPage;