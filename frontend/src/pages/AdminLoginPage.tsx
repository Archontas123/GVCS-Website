import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAdminAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(formData.username.trim(), formData.password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#CECDE2',
      }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid transparent',
            borderTop: '4px solid #212529',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

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
            marginBottom: '16px',
            letterSpacing: '0.05em',
            textShadow: '4px 4px 0px #212529',
          }}>
            Hack The Valley
          </h1>

          <h2 style={{
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: '48px',
            letterSpacing: '0.05em',
            textShadow: '2px 2px 0px #212529',
          }}>
            Admin Portal
          </h2>

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
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoFocus
                placeholder="Admin"
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
              disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: (isLoading || !formData.username.trim() || !formData.password.trim()) ? '#6b7280' : '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1.2rem',
                padding: '24px 48px',
                cursor: (isLoading || !formData.username.trim() || !formData.password.trim()) ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: "'Press Start 2P', cursive",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && formData.username.trim() && formData.password.trim()) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && formData.username.trim() && formData.password.trim()) {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
              onMouseDown={(e) => {
                if (!isLoading && formData.username.trim() && formData.password.trim()) {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading && formData.username.trim() && formData.password.trim()) {
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
              {isLoading ? 'Loading...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '32px' }}>
            <p style={{
              fontSize: '0.6rem',
              color: '#212529',
              marginBottom: '16px',
              lineHeight: '1.6',
            }}>
              Not an admin?{' '}
              <button
                type="button"
                onClick={() => navigate('/')}
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
                Team Portal
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLoginPage;
