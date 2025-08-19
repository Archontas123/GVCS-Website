/**
 * CS Club Hackathon Platform - Home Page
 * Phase 1.4: Landing page with registration and login options (CSS-based, removed MUI)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/theme.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();


  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      padding: '32px 16px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h1 
            style={{ 
              fontWeight: 700, 
              fontSize: '3rem',
              color: '#1d4ed8',
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Hack The Valley
          </h1>
          
          
          <div 
            style={{
              width: '120px',
              height: '4px',
              background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
              margin: '0 auto 32px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
            }}
          ></div>


          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
              }}
            >
              Register Team
            </button>
            
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#ffffff',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#1d4ed8';
                e.currentTarget.style.color = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Team Login
            </button>
          </div>
        </div>


      </div>
    </div>
  );
};

export default HomePage;