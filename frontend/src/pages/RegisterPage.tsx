/**
 * CS Club Hackathon Platform - Team Registration Page
 * Phase 1.4: Team registration form with validation (CSS-based, removed MUI)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { RegisterFormData } from '../types';
import { useAuth } from '../hooks/useAuth';
import '../styles/theme.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    teamName: '',
    contestCode: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (error) setError(null);
    if (success) setSuccess(null);
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

    if (formData.teamName.length < 3) {
      setError('Team name must be at least 3 characters long');
      return;
    }

    // Validate team name format
    const teamNameRegex = /^[a-zA-Z0-9_]+_[a-zA-Z]+(?:,[a-zA-Z]+)*$/;
    if (!teamNameRegex.test(formData.teamName)) {
      setError('Team name must follow format: school_lastname,lastname,lastname (e.g., "MIT_Smith,Johnson,Brown")');
      return;
    }

    // Validate contest code format
    const contestCodeRegex = /^[A-Z0-9]{8}$/;
    if (!contestCodeRegex.test(formData.contestCode.trim().toUpperCase())) {
      setError('Contest code must be exactly 8 characters containing only uppercase letters and numbers');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.registerTeam({
        teamName: formData.teamName,
        contestCode: formData.contestCode.trim().toUpperCase()
      });
      
      if (response.success && response.data) {
        // Create team object from registration response
        const team = {
          id: response.data.teamId,
          teamName: response.data.teamName,
          contestCode: response.data.contestCode,
          sessionToken: '', // Will be set when token is decoded
          registeredAt: response.data.registeredAt,
          lastActivity: new Date().toISOString(),
          isActive: true
        };
        
        // Update auth state (this also sets the token)
        auth.login(team, response.data.token);
        setSuccess('Team registered successfully! Redirecting to dashboard...');
        
        // Let the App.tsx routing handle the redirect automatically
        setTimeout(() => {
          // The /register route will detect auth.isAuthenticated = true and redirect to /dashboard
        }, 1000);
        
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 400) {
        setError('Invalid registration data. Please check your team name and contest code format.');
      } else if (err.response?.status === 409) {
        setError('Team name already exists for this contest. Please choose a different name.');
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
          maxWidth: '520px',
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
            👥
          </div>
          
          <h1 style={{ 
            fontWeight: 700, 
            fontSize: '2rem',
            color: '#1f2937',
            marginBottom: '8px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Team Registration
          </h1>
          
          <p style={{ 
            color: '#6b7280',
            fontSize: '1rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Register your team to start competing
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

        {/* Success Alert */}
        {success && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            marginBottom: '24px',
            color: '#065f46',
            fontSize: '0.9rem',
            fontWeight: 500,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            {success}
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
              Team Name *
            </label>
            <div style={{
              marginBottom: '8px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#0c4a6e',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              <strong>Format:</strong> school_lastname,lastname,lastname
              <br />
              <strong>Example:</strong> MIT_Smith,Johnson,Brown
            </div>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="e.g., MIT_Smith,Johnson,Brown"
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
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.9rem',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Contest Code *
            </label>
            <div style={{
              marginBottom: '8px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#0c4a6e',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              <strong>Format:</strong> 8 uppercase letters/numbers (e.g., SGY6GPTJ, FU83XKD2)
            </div>
            <input
              type="text"
              name="contestCode"
              value={formData.contestCode}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="e.g., SGY6GPTJ"
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
              marginTop: '8px',
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
            {isLoading ? 'Registering...' : 'Register Team'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ 
            fontSize: '0.875rem',
            color: '#6b7280',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Already have a team account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
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
              Login here
            </button>
          </p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
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
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;