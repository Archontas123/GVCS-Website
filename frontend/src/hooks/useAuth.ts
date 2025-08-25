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
          const response = await apiService.getTeamStatus();
          
          if (response.success && response.data) {
            setAuthState({
              isAuthenticated: true,
              team: response.data.team,
              token,
            });
          } else {
            apiService.removeAuthToken();
            setAuthState({
              isAuthenticated: false,
              team: null,
              token: null,
            });
          }
        } catch (error: any) {
          console.error('Auth verification failed:', error);
          

          if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
            console.warn('Connection error during auth verification. Keeping token for retry.');
            setAuthState({
              isAuthenticated: false,
              team: null,
              token,
            });
          } else {
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
    setLoading(false); 
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