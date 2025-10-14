import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '64px',
            letterSpacing: '0.05em',
            textShadow: '4px 4px 0px #212529',
          }}>
            Hack The Valley
          </h1>

          <button
            onClick={() => navigate('/join-contest')}
            style={{
              position: 'relative',
              border: '4px solid #212529',
              backgroundColor: '#2D58A6',
              color: 'white',
              transition: 'all 0.15s ease-in-out',
              boxShadow: '6px 6px 0px #212529',
              textShadow: '2px 2px 0px #212529',
              fontSize: 'clamp(1rem, 3vw, 1.5rem)',
              padding: 'clamp(18px, 4vw, 24px) clamp(36px, 8vw, 48px)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', cursive",
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
            Join Contest
          </button>
        </div>
      </div>
    </>
  );
};

export default HomePage;
