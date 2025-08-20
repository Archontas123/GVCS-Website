/**
 * CS Club Hackathon Platform - Authentication Hook
 * Phase 1.4: Custom hook for managing authentication state
 */

import { useState, useEffect } from 'react';
import { AuthState, Team } from '../types';
import apiService from '../services/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    team: null,
    token: null,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiService.getAuthToken();
      
      if (token) {
        try {
          // Verify token and get team info
          const response = await apiService.getTeamStatus();
          
          if (response.success && response.data) {
            setAuthState({
              isAuthenticated: true,
              team: response.data.team,
              token,
            });
          } else {
            // Token is invalid
            apiService.removeAuthToken();
            setAuthState({
              isAuthenticated: false,
              team: null,
              token: null,
            });
          }
        } catch (error: any) {
          console.error('Auth verification failed:', error);
          
          // If it's a connection error, don't remove the token immediately
          // Give the user a chance to retry when the server comes back
          if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
            console.warn('Connection error during auth verification. Keeping token for retry.');
            // Set auth state to false but keep the token
            setAuthState({
              isAuthenticated: false,
              team: null,
              token,
            });
          } else {
            // For other errors (invalid token, etc.), remove the token
            apiService.removeAuthToken();
            setAuthState({
              isAuthenticated: false,
              team: null,
              token: null,
            });
          }
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          team: null,
          token: null,
        });
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (team: Team, token: string) => {
    apiService.setAuthToken(token);
    setAuthState({
      isAuthenticated: true,
      team,
      token,
    });
    setLoading(false); // Ensure loading is false after login
  };

  const logout = () => {
    apiService.removeAuthToken();
    setAuthState({
      isAuthenticated: false,
      team: null,
      token: null,
    });
  };

  const updateTeam = (team: Team) => {
    setAuthState(prev => ({
      ...prev,
      team,
    }));
  };

  return {
    ...authState,
    loading,
    login,
    logout,
    updateTeam,
  };
};