/**
 * CS Club Hackathon Platform - Admin Authentication Hook
 * Phase 2.3: Admin authentication and state management
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'judge';
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

  // Check for existing admin token on mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem('hackathon_admin_token');
        if (token) {
          // Set the admin token in API service
          apiService.setAdminToken(token);
          // TODO: Add admin profile endpoint to verify token
          // For now, we'll assume token is valid
          const mockAdmin: AdminUser = {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            role: 'super_admin'
          };
          setAdmin(mockAdmin);
        }
      } catch (error) {
        // Token is invalid, clear it
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
        
        // Store token and admin data
        localStorage.setItem('hackathon_admin_token', token);
        apiService.setAdminToken(token);
        setAdmin(adminData);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Clear any existing auth state
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