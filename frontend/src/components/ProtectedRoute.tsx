/**
 * CS Club Hackathon Platform - Protected Route Component
 * Phase 1.4: Route guard for authenticated pages
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = apiService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;