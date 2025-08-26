import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { createContestSlug } from '../utils/contestUtils';
import '../styles/theme.css';

interface TeamRegistrationData {
  schoolName: string;
  member1LastName: string;
  member2LastName: string;
  member3LastName: string;
  password: string;
  confirmPassword: string;
}

const TeamRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  
  const contestCode = location.state?.contestCode;
  const contestName = location.state?.contestName;

  React.useEffect(() => {
    if (!contestCode) {
      navigate('/join-contest');
    }
  }, [contestCode, navigate]);

  const [formData, setFormData] = useState<TeamRegistrationData>({
    schoolName: '',
    member1LastName: '',
    member2LastName: '',
    member3LastName: '',
    password: '',
    confirmPassword: '',
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

  const generateTeamName = () => {
    const { schoolName, member1LastName, member2LastName, member3LastName } = formData;
    
    if (!schoolName || !member1LastName) return '';
    
    const members = [member1LastName, member2LastName, member3LastName].filter(name => name.trim());
    return `${schoolName}_${members.join(',')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return;
    }
    
    if (!formData.member1LastName.trim()) {
      setError('At least one team member is required');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const nameRegex = /^[a-zA-Z]+$/;
    const names = [formData.member1LastName, formData.member2LastName, formData.member3LastName]
      .filter(name => name.trim());
    
    for (const name of names) {
      if (!nameRegex.test(name.trim())) {
        setError('Member names must contain only letters');
        return;
      }
    }

    if (!nameRegex.test(formData.schoolName.trim())) {
      setError('School name must contain only letters');
      return;
    }

    const teamName = generateTeamName();
    if (!teamName) {
      setError('Unable to generate team name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.registerTeam({
        teamName,
        contestCode,
        password: formData.password,
        schoolName: formData.schoolName,
        memberNames: [formData.member1LastName, formData.member2LastName, formData.member3LastName]
          .filter(name => name.trim())
      });
      
      if (response.success && response.data) {
        const team = {
          id: response.data.teamId,
          teamName: response.data.teamName,
          contestCode: response.data.contestCode,
          sessionToken: '', 
          registeredAt: response.data.registeredAt,
          lastActivity: new Date().toISOString(),
          isActive: true
        };
        
        auth.login(team, response.data.token);
        setSuccess('Team registered successfully! Redirecting to contest...');
        
        setTimeout(() => {
          const contestSlug = createContestSlug(response.data.contestName);
          navigate(`/contest/${contestSlug}`);
        }, 1500);
        
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 400) {
        setError('Invalid registration data. Please check your information.');
      } else if (err.response?.status === 409) {
        setError('Team name already exists for this contest. Please try to login instead if you have already registered.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!contestCode) {
    return null; 
  }

  const previewTeamName = generateTeamName();

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
          maxWidth: '600px',
          width: '100%',
          padding: '48px 40px',
        }}
      >
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
            Team
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
            marginBottom: '8px'
          }}>
            Register your team for {contestName || 'the contest'}
          </p>

          <div style={{
            padding: '8px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#1d4ed8',
            fontWeight: 600,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Contest Code: {contestCode}
          </div>
        </div>

        {previewTeamName && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            color: '#166534',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            <strong>Your team name will be:</strong> {previewTeamName}
          </div>
        )}

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
              School Name *
            </label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="e.g., MIT, Stanford, Harvard"
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
            <h3 style={{
              fontWeight: 600,
              color: '#374151',
              fontSize: '1rem',
              marginBottom: '16px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Team Members (Last Names Only) *
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Member 1 Last Name *
                </label>
                <input
                  type="text"
                  name="member1LastName"
                  value={formData.member1LastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="e.g., Smith"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Member 2 Last Name (Optional)
                </label>
                <input
                  type="text"
                  name="member2LastName"
                  value={formData.member2LastName}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="e.g., Johnson"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Member 3 Last Name (Optional)
                </label>
                <input
                  type="text"
                  name="member3LastName"
                  value={formData.member3LastName}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="e.g., Brown"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontWeight: 600,
              color: '#374151',
              fontSize: '1rem',
              marginBottom: '16px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            }}>
              Team Password *
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
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
                  placeholder="Enter a secure password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.85rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Re-enter your password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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
            </div>
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
            {isLoading ? 'Registering Team...' : 'Register Team'}
          </button>
        </form>

=        <div style={{ textAlign: 'center', marginTop: '32px' }}>          
          <button
            type="button"
            onClick={() => navigate('/join-contest')}
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
            ← Back to Contest Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamRegistrationPage;