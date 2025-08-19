/**
 * Hack The Valley - Team Login Page
 * Team authentication for hackathon participation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { LoginFormData } from '../types';
import '../styles/theme.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<LoginFormData>({
    teamName: '',
    contestCode: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamName.trim()) {
      setError('Team name is required');
      return;
    }
    
    if (!formData.contestCode.trim()) {
      setError('Contest code is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.loginTeam(formData);
      
      if (response.success && response.data) {
        // Store auth token
        apiService.setAuthToken(response.data.token);
        
        // Redirect to dashboard
        navigate('/dashboard');
        
      } else {
        setError(response.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        setError(err.response.data.details);
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        padding: '32px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
          maxWidth: '480px',
          width: '100%',
          padding: '48px 40px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25)',
              fontSize: '2rem',
            }}
          >
            🔑
          </div>
          
          <h1 style={{ 
            fontWeight: 700, 
            fontSize: '2rem',
            color: '#1f2937',
            marginBottom: '8px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Hack The Valley
          </h1>
          
          <p style={{ 
            color: '#6b7280',
            fontSize: '1rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Enter your team credentials to join the hackathon
          </p>
          </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '24px',
            color: '#dc2626',
            fontSize: '0.9rem',
            fontWeight: 500,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.9rem',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Team Name
            </label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter your registered team name"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                backgroundColor: isLoading ? '#f9fafb' : '#ffffff',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1d4ed8';
                e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.9rem',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Contest Code
            </label>
            <input
              type="text"
              name="contestCode"
              value={formData.contestCode}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter the contest code"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                backgroundColor: isLoading ? '#f9fafb' : '#ffffff',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1d4ed8';
                e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: isLoading 
                ? 'none' 
                : '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
              marginTop: '24px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
              }
            }}
          >
            {isLoading && (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid transparent',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px',
                }}
              ></div>
            )}
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ 
            fontSize: '0.875rem',
            color: '#6b7280',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Don't have a team account yet?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                padding: '0',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1d4ed8';
              }}
            >
              Register here
            </button>
          </p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              padding: '0',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            Admin Login →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;