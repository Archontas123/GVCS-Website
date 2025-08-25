import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'admin';
}

interface AdminAuthState {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAdminAuth = (): AdminAuthState => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem('hackathon_admin_token');
        if (token) {
          apiService.setAdminToken(token);
          const response = await apiService.getAdminProfile();
          if (response.success && response.data) {
            const adminData: AdminUser = {
              id: response.data.id,
              username: response.data.username,
              email: response.data.email,
              role: 'admin' as const
            };
            setAdmin(adminData);
          } else {
            throw new Error('Failed to verify admin token');
          }
        }
      } catch (error) {
        localStorage.removeItem('hackathon_admin_token');
        apiService.removeAdminToken();
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiService.adminLogin({ username, password });
      
      if (response.success && response.data) {
        const { admin: adminData, token } = response.data;
        
        localStorage.setItem('hackathon_admin_token', token);
        apiService.setAdminToken(token);
        setAdmin(adminData);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      localStorage.removeItem('hackathon_admin_token');
      apiService.removeAdminToken();
      setAdmin(null);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hackathon_admin_token');
    apiService.removeAdminToken();
    setAdmin(null);
  }, []);

  return {
    isAuthenticated: !!admin,
    admin,
    loading,
    login,
    logout,
  };
};