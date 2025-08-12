/**
 * CS Club Hackathon Platform - App Component Tests
 * Phase 1.4: Basic app rendering tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-router-dom to avoid issues in tests
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the API service to avoid network calls in tests
jest.mock('./services/api', () => ({
  isAuthenticated: () => false,
  getAuthToken: () => null,
}));

// Mock the auth hook
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    team: null,
    token: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateTeam: jest.fn(),
  }),
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    // App should render without throwing an error
  });

  test('renders home page content for unauthenticated users', () => {
    render(<App />);
    
    // Check for home page content
    expect(screen.getByText(/CS Club Hackathon Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Register Team/i)).toBeInTheDocument();
    expect(screen.getByText(/Team Login/i)).toBeInTheDocument();
  });

  test('applies Material-UI theme correctly', () => {
    const { container } = render(<App />);
    
    // Check that MUI's CssBaseline is applied by looking for MUI classes
    expect(container.querySelector('.MuiCssBaseline-root')).toBeTruthy();
  });
});
