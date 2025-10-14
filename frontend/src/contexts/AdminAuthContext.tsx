import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiService from '../services/api';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'admin';
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem('programming_contest_admin_token');
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
            console.warn('Failed to verify admin token:', response.message);
            localStorage.removeItem('programming_contest_admin_token');
            apiService.removeAdminToken();
            setAdmin(null);
          }
        }
      } catch (error: any) {
        console.error('Admin auth check failed:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('programming_contest_admin_token');
          apiService.removeAdminToken();
        } else {
          console.warn('Network or server error during admin auth check, clearing admin state');
          localStorage.removeItem('programming_contest_admin_token');
          apiService.removeAdminToken();
          setAdmin(null);
        }
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

        localStorage.setItem('programming_contest_admin_token', token);
        apiService.setAdminToken(token);
        setAdmin(adminData);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      localStorage.removeItem('programming_contest_admin_token');
      apiService.removeAdminToken();
      setAdmin(null);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('programming_contest_admin_token');
    apiService.removeAdminToken();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: !!admin,
        admin,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
