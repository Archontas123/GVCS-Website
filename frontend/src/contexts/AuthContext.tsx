import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, Team } from '../types';
import apiService from '../services/api';
import { createContestSlug } from '../utils/contestUtils';

interface AuthContextType extends AuthState {
  loading: boolean;
  login: (team: Team, token: string) => void;
  logout: () => void;
  updateTeam: (team: Team) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    team: null,
    token: null,
  });

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) {
      console.log('InitializeAuth skipped - already initialized');
      return;
    }

    const initializeAuth = async () => {
      const token = apiService.getAuthToken();
      console.log('InitializeAuth running, token exists:', !!token);

      if (token) {
        try {
          console.log('Verifying auth with API...');
          const response = await apiService.getTeamStatus();

          if (response.success && response.data) {
            console.log('Auth verification successful');
            const contestName =
              response.data.team.contestName ||
              response.data.contest?.contestName;
            const teamWithSlug: Team = {
              ...response.data.team,
              contestName,
              contestSlug:
                response.data.team.contestSlug ||
                (contestName ? createContestSlug(contestName) : undefined),
            };
            setAuthState({
              isAuthenticated: true,
              team: teamWithSlug,
              token,
            });
          } else {
            console.log('Auth verification failed - invalid response');
            apiService.removeAuthToken();
            setAuthState({
              isAuthenticated: false,
              team: null,
              token: null,
            });
          }
        } catch (error: any) {
          console.error('Auth verification failed:', error);

          if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.response?.status === 429) {
            console.warn('Connection error or rate limit during auth verification. Keeping token for retry.');
            setAuthState({
              isAuthenticated: false,
              team: null,
              token,
            });
          } else {
            console.error('Removing auth token due to verification failure:', error.response?.status, error.response?.data);
            apiService.removeAuthToken();
            setAuthState({
              isAuthenticated: false,
              team: null,
              token: null,
            });
          }
        }
      } else {
        console.log('No token found, setting unauthenticated state');
        setAuthState({
          isAuthenticated: false,
          team: null,
          token: null,
        });
      }

      setLoading(false);
      setInitialized(true);
    };

    initializeAuth();
  }, [initialized]);

  const login = (team: Team, token: string) => {
    console.log('Login called with team:', team.teamName);
    const contestName = team.contestName;
    const teamWithSlug: Team = {
      ...team,
      contestSlug:
        team.contestSlug ||
        (contestName ? createContestSlug(contestName) : undefined),
    };
    apiService.setAuthToken(token);
    setAuthState({
      isAuthenticated: true,
      team: teamWithSlug,
      token,
    });
    setLoading(false);
    setInitialized(true);
    console.log('Login completed, auth state set to authenticated');
  };

  const logout = () => {
    apiService.removeAuthToken();
    setAuthState({
      isAuthenticated: false,
      team: null,
      token: null,
    });
    setInitialized(false);
  };

  const updateTeam = (team: Team) => {
    setAuthState(prev => ({
      ...prev,
      team,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        loading,
        login,
        logout,
        updateTeam,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
