/**
 * CS Club Hackathon Platform - Protected Route Component
 * Phase 1.4: Route guard for authenticated pages
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = apiService.isAuthenticated();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Save the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;