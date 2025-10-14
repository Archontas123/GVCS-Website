import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import { RegisterFormData } from '../types';
import { useAuth } from '../hooks/useAuth';
import { createContestSlug } from '../utils/contestUtils';

interface TeamRegistrationData {
  schoolName: string;
  member1FirstName: string;
  member1LastName: string;
  member2FirstName: string;
  member2LastName: string;
  member3FirstName: string;
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
    member1FirstName: '',
    member1LastName: '',
    member2FirstName: '',
    member2LastName: '',
    member3FirstName: '',
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
    const trimmedSchoolName = schoolName.trim();
    const primaryLastName = member1LastName.trim();

    if (!trimmedSchoolName || !primaryLastName) return '';

    const sanitizedSchoolName = trimmedSchoolName.replace(/\s+/g, '');
    const lastNames = [member1LastName, member2LastName, member3LastName]
      .filter(name => name.trim())
      .map(name => name.trim());

    return `${sanitizedSchoolName}_${lastNames.join(',')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return;
    }
    
    if (!formData.member1FirstName.trim() || !formData.member1LastName.trim()) {
      setError('At least one team member with first and last name is required');
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

    const memberNameRegex = /^[a-zA-Z]+$/;
    const schoolNameRegex = /^[a-zA-Z\s]+$/;
    const allNames = [
      formData.member1FirstName, formData.member1LastName,
      formData.member2FirstName, formData.member2LastName,
      formData.member3FirstName, formData.member3LastName
    ].filter(name => name.trim());

    for (const name of allNames) {
      if (!memberNameRegex.test(name.trim())) {
        setError('Member names must contain only letters');
        return;
      }
    }

    if (!schoolNameRegex.test(formData.schoolName.trim())) {
      setError('School name must contain only letters and spaces');
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
      // Build members array with first and last names
      const members: RegisterFormData['members'] = [];
      if (formData.member1FirstName.trim() && formData.member1LastName.trim()) {
        members.push({ firstName: formData.member1FirstName.trim(), lastName: formData.member1LastName.trim() });
      }
      if (formData.member2FirstName.trim() && formData.member2LastName.trim()) {
        members.push({ firstName: formData.member2FirstName.trim(), lastName: formData.member2LastName.trim() });
      }
      if (formData.member3FirstName.trim() && formData.member3LastName.trim()) {
        members.push({ firstName: formData.member3FirstName.trim(), lastName: formData.member3LastName.trim() });
      }

      const response = await apiService.registerTeam({
        teamName,
        contestCode,
        password: formData.password,
        schoolName: formData.schoolName.trim(),
        members
      });
      
      if (response.success && response.data) {
        const contestSlug = createContestSlug(response.data.contestName);
        const team = {
          id: response.data.teamId,
          teamName: response.data.teamName,
          contestCode: response.data.contestCode,
          contestName: response.data.contestName,
          contestSlug,
          sessionToken: '', 
          registeredAt: response.data.registeredAt,
          lastActivity: new Date().toISOString(),
          isActive: true
        };
        
        auth.login(team, response.data.token);
        setSuccess('Team registered successfully! Redirecting to contest...');
        
        setTimeout(() => {
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
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <h1 style={{
            fontSize: 'clamp(1.2rem, 3vw, 2rem)',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '32px',
            letterSpacing: '0.05em',
            textShadow: '4px 4px 0px #212529',
            textAlign: 'center',
          }}>
            Team Registration
          </h1>

          <div style={{
            padding: '12px 20px',
            backgroundColor: '#2D58A6',
            border: '4px solid #212529',
            boxShadow: '4px 4px 0px #212529',
            marginBottom: '24px',
            fontSize: '0.7rem',
            color: 'white',
            textShadow: '2px 2px 0px #212529',
            textAlign: 'center',
          }}>
            Contest: {contestName || 'the contest'}
            <br />
            Code: {contestCode}
          </div>

          {previewTeamName && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#D4F1D4',
              border: '4px solid #212529',
              boxShadow: '4px 4px 0px #212529',
              marginBottom: '24px',
              fontSize: '0.65rem',
              color: '#212529',
              lineHeight: '1.6',
            }}>
              Team name: {previewTeamName}
            </div>
          )}

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
              }}>
              {error}
            </div>
          )}

          {success && (
            <div
              data-testid="success-message"
              style={{
                padding: '16px 20px',
                backgroundColor: '#D4F1D4',
                border: '4px solid #166534',
                marginBottom: '24px',
                color: '#166534',
                fontSize: '0.7rem',
                lineHeight: '1.6',
              }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#212529',
                fontSize: '0.75rem',
                textAlign: 'left',
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
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '4px solid #212529',
                  fontSize: '0.9rem',
                  fontFamily: "'Press Start 2P', cursive",
                  backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                  boxShadow: '4px 4px 0px #212529',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                color: '#212529',
                fontSize: '0.8rem',
                marginBottom: '16px',
                textAlign: 'left',
              }}>
                Team Members *
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    textAlign: 'left',
                  }}>
                    Member 1 *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      name="member1FirstName"
                      placeholder="First Name"
                      value={formData.member1FirstName}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                    <input
                      type="text"
                      name="member1LastName"
                      placeholder="Last Name"
                      value={formData.member1LastName}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    textAlign: 'left',
                  }}>
                    Member 2 (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      name="member2FirstName"
                      placeholder="First Name"
                      value={formData.member2FirstName}
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                    <input
                      type="text"
                      name="member2LastName"
                      placeholder="Last Name"
                      value={formData.member2LastName}
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    textAlign: 'left',
                  }}>
                    Member 3 (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      name="member3FirstName"
                      placeholder="First Name"
                      value={formData.member3FirstName}
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                    <input
                      type="text"
                      name="member3LastName"
                      placeholder="Last Name"
                      value={formData.member3LastName}
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '4px solid #212529',
                        fontSize: '0.85rem',
                        fontFamily: "'Press Start 2P', cursive",
                        backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                        boxShadow: '4px 4px 0px #212529',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                color: '#212529',
                fontSize: '0.8rem',
                marginBottom: '16px',
                textAlign: 'left',
              }}>
                Team Password *
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
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
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '4px solid #212529',
                      fontSize: '0.85rem',
                      fontFamily: "'Press Start 2P', cursive",
                      backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                      boxShadow: '4px 4px 0px #212529',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    textAlign: 'left',
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
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '4px solid #212529',
                      fontSize: '0.85rem',
                      fontFamily: "'Press Start 2P', cursive",
                      backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                      boxShadow: '4px 4px 0px #212529',
                    }}
                  />
                </div>
              </div>
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
                fontSize: '1rem',
                padding: '20px 40px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: "'Press Start 2P', cursive",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              {isLoading ? 'Loading...' : 'Register Team'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              type="button"
              onClick={() => navigate('/join-contest')}
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
              ← Back to Contest Code
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamRegistrationPage;
