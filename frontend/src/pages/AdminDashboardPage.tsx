import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();

  const handleManageContests = () => {
    navigate('/admin/contests');
  };

  const handleManageProblems = () => {
    navigate('/admin/problems');
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
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
          padding: '32px 16px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '48px', textAlign: 'center' }}>
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
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0px #212529',
            }}>
              Admin Dashboard
            </h2>
          </div>

          {/* Main Dashboard Actions */}
          <div style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}>
            <h3 style={{
              fontSize: 'clamp(0.75rem, 2vw, 1rem)',
              fontWeight: 'bold',
              color: '#212529',
              marginBottom: '48px',
            }}>
              Choose what to manage
            </h3>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={handleManageContests}
                data-testid="contest-management-button"
                style={{
                  position: 'relative',
                  border: '4px solid #212529',
                  backgroundColor: '#2D58A6',
                  color: 'white',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: '6px 6px 0px #212529',
                  textShadow: '2px 2px 0px #212529',
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  padding: 'clamp(24px, 4vw, 32px) clamp(36px, 6vw, 48px)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                  minWidth: '200px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                }}
              >
                Contests
              </button>

              <button
                onClick={handleManageProblems}
                style={{
                  position: 'relative',
                  border: '4px solid #212529',
                  backgroundColor: '#2D58A6',
                  color: 'white',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: '6px 6px 0px #212529',
                  textShadow: '2px 2px 0px #212529',
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  padding: 'clamp(24px, 4vw, 32px) clamp(36px, 6vw, 48px)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                  minWidth: '200px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                }}
              >
                Problems
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '64px' }}>
            <p style={{
              fontSize: '0.6rem',
              color: '#212529',
              lineHeight: '1.6',
            }}>
              Return to{' '}
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

export default AdminDashboardPage;
