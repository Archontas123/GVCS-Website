import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { LoginFormData } from '../types';
import { useAuth } from '../hooks/useAuth';
import { createContestSlug } from '../utils/contestUtils';

const TeamLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    teamName: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.loginTeam(formData);

      if (response.success && response.data) {
        const contestSlug = createContestSlug(response.data.contestName);
        const team = {
          id: response.data.teamId,
          teamName: response.data.teamName,
          contestCode: response.data.contestCode,
          contestName: response.data.contestName,
          contestSlug,
          schoolName: response.data.schoolName,
          memberNames: response.data.memberNames,
          sessionToken: '',
          registeredAt: '',
          lastActivity: response.data.lastActivity || new Date().toISOString(),
          isActive: true
        };

        auth.login(team, response.data.token);

        const targetPath = contestSlug ? `/contest/${contestSlug}` : '/dashboard';
        navigate(targetPath, { replace: true });

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
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: '#CECDE2',
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
        }}>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '48px',
            letterSpacing: '0.05em',
            textShadow: '4px 4px 0px #212529',
          }}>
            Team Login
          </h1>

          {error && (
            <div
              data-testid="error-message"
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                marginBottom: '24px',
                color: '#dc2626',
                fontSize: '0.7rem',
                lineHeight: '1.6',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#212529',
                fontSize: '0.75rem',
                textAlign: 'left',
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
                placeholder="Your Team"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '4px solid #212529',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  fontFamily: "'Press Start 2P', cursive",
                  backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                  boxShadow: '4px 4px 0px #212529',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#212529',
                fontSize: '0.75rem',
                textAlign: 'left',
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '4px solid #212529',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  fontFamily: "'Press Start 2P', cursive",
                  backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                  boxShadow: '4px 4px 0px #212529',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: isLoading ? '#6b7280' : '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1.2rem',
                padding: '24px 48px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: "'Press Start 2P', cursive",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
              onMouseDown={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                }
              }}
            >
              {isLoading && (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid transparent',
                    borderTop: '3px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block',
                    marginRight: '12px',
                  }}
                />
              )}
              {isLoading ? 'Loading...' : 'Login'}
            </button>
          </form>

          <div style={{ marginTop: '32px' }}>
            <p style={{
              fontSize: '0.6rem',
              color: '#212529',
              marginBottom: '16px',
              lineHeight: '1.6',
            }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/join-contest')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2D58A6',
                  padding: '0',
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: "'Press Start 2P', cursive",
                }}
              >
                Register here
              </button>
            </p>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#212529',
                padding: '0',
                fontSize: '0.6rem',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamLoginPage;
