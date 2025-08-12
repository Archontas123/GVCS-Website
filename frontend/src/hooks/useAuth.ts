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
        } catch (error) {
          console.error('Auth verification failed:', error);
          apiService.removeAuthToken();
          setAuthState({
            isAuthenticated: false,
            team: null,
            token: null,
          });
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