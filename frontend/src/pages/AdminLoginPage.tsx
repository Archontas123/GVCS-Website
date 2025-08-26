import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import '../styles/theme.css';

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
      // Use replace to prevent going back to login page
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center full-height">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div
      className="flex-center p-4"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div 
        className="card" 
        style={{ 
          maxWidth: '420px', 
          width: '100%', 
          margin: '0 16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
        }}
      >
        <div className="card-content" style={{ padding: '48px 40px' }}>
          <div className="text-center mb-5">
            <h1 
              className="mb-2" 
              style={{ 
                fontWeight: 700, 
                fontSize: '2.4rem',
                color: '#1d4ed8',
                letterSpacing: '-0.02em',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
            >
              Hack The Valley
            </h1>
            
            <h2 
              className="mb-3" 
              style={{ 
                fontWeight: 500, 
                fontSize: '1.1rem',
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
            >
              Administrator Portal
            </h2>
            
            <div 
              style={{
                width: '80px',
                height: '4px',
                background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                margin: '0 auto',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
              }}
            ></div>
          </div>

          {error && (
            <div 
              style={{ 
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '24px',
                color: '#dc2626',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              <strong>Authentication Failed:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label 
                style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
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
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  padding: '16px 18px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1d4ed8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
                  e.target.style.outline = 'none';
                  e.target.style.backgroundColor = '#dbeafe';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                  e.target.style.backgroundColor = '#ffffff';
                }}
              />
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <label 
                style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  padding: '16px 18px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1d4ed8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
                  e.target.style.outline = 'none';
                  e.target.style.backgroundColor = '#dbeafe';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                  e.target.style.backgroundColor = '#ffffff';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '20px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: isLoading || !formData.username.trim() || !formData.password.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !formData.username.trim() || !formData.password.trim() ? 0.6 : 1,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && formData.username.trim() && formData.password.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
              }}
            >
              {isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    marginLeft: '-10px',
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                ></div>
              )}
              <span style={{ opacity: isLoading ? 0 : 1 }}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </span>
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <div 
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
                margin: '32px 0 24px',
              }}
            ></div>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
              Not an administrator?{' '}
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d4ed8',
                  padding: '0',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                  e.currentTarget.style.color = '#1e40af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                  e.currentTarget.style.color = '#1d4ed8';
                }}
              >
                Return to Team Portal
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;