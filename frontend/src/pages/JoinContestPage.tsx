import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinContestPage: React.FC = () => {
  const navigate = useNavigate();

  const [contestCode, setContestCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setContestCode(value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contestCode.trim()) {
      setError('Contest code is required');
      return;
    }

    const contestCodeRegex = /^[A-Z0-9]{8}$/;
    if (!contestCodeRegex.test(contestCode.trim())) {
      setError('Contest code must be exactly 8 characters containing only uppercase letters and numbers');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contests/${contestCode}/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        navigate('/team-registration', {
          state: {
            contestCode: contestCode.trim(),
            contestName: data.data.contestName
          }
        });
      } else {
        setError(data.message || 'Invalid contest code or contest not available');
      }
    } catch (err: any) {
      console.error('Contest validation error:', err);
      setError('Unable to validate contest code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          @keyframes walk {
            0% { transform: translateX(0); }
            48% { transform: translateX(10px); }
            50% { transform: translateX(10px) scaleX(-1); }
            98% { transform: translateX(0) scaleX(-1); }
            100% { transform: translateX(0) scaleX(1); }
          }
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
        {/* Main Content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
        }}>
          {error && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#fef2f2',
              border: '4px solid #dc2626',
              marginBottom: '24px',
              color: '#dc2626',
              fontSize: '0.7rem',
              lineHeight: '1.6',
              textAlign: 'left',
            }}>
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
                Contest Code
              </label>
              <input
                type="text"
                value={contestCode}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="8 CHARS"
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '4px solid #212529',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  fontFamily: "'Press Start 2P', cursive",
                  backgroundColor: isLoading ? '#e5e7eb' : '#ffffff',
                  boxShadow: '4px 4px 0px #212529',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || contestCode.length !== 8}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: (isLoading || contestCode.length !== 8) ? '#6b7280' : '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1.2rem',
                padding: '24px 48px',
                cursor: (isLoading || contestCode.length !== 8) ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: "'Press Start 2P', cursive",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && contestCode.length === 8) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && contestCode.length === 8) {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
              onMouseDown={(e) => {
                if (!isLoading && contestCode.length === 8) {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading && contestCode.length === 8) {
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
              {isLoading ? 'Loading...' : 'Join Contest'}
            </button>
          </form>

          <div style={{ marginTop: '32px' }}>
            <p style={{
              fontSize: '0.6rem',
              color: '#212529',
              marginBottom: '16px',
              lineHeight: '1.6',
            }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
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
                Login here
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

export default JoinContestPage;
