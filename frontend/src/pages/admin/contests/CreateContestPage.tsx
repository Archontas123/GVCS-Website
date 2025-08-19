/**
 * Create Contest Page
 * Updated to match modern admin dashboard UI design
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';
import Breadcrumb from '../../../components/common/Breadcrumb';
import RichTextEditor from '../../../components/common/RichTextEditor';
import DateTimePicker from '../../../components/common/DateTimePicker';

interface ContestFormData {
  contestName: string;
  description: string;
  start_time: string;
  duration: number;
  freeze_time: number;
}

const CreateContestPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();
  
  const [formData, setFormData] = useState<ContestFormData>({
    contestName: '',
    description: '',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    duration: 120, // 2 hours
    freeze_time: 30, // 30 minutes before end
  });
  
  const [saving, setSaving] = useState(false);

  const breadcrumbItems = [
    { label: 'Manage Contests', href: '/admin/contests' },
    { label: 'Create' },
  ];

  const handleInputChange = (field: keyof ContestFormData) => (value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!formData.contestName.trim()) {
        throw new Error('Contest name is required');
      }
      
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      
      if (formData.duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }

      // Prepare contest data for API
      const contestData = {
        contest_name: formData.contestName,
        description: formData.description,
        start_time: formData.start_time,
        duration: formData.duration,
        freeze_time: formData.freeze_time
      };

      console.log('Creating contest with data:', contestData);
      const result = await apiService.createContest(contestData);
      console.log('Create contest response:', result);
      
      if (result.success) {
        console.log('Contest created successfully:', result.data);
        navigate('/admin/contests');
      } else {
        throw new Error(result.message || 'Failed to create contest');
      }
    } catch (error) {
      console.error('Failed to save contest:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create contest'}`);
    } finally {
      setSaving(false);
    }
  };

  const getEndTime = () => {
    return new Date(new Date(formData.start_time).getTime() + formData.duration * 60000);
  };

  return (
    <>
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
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          padding: '32px 16px',
        }}
      >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 
            style={{ 
              fontWeight: 700, 
              fontSize: '2.4rem',
              color: '#1d4ed8',
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Create Contest
          </h1>
          
          <h2 
            style={{ 
              fontWeight: 500, 
              fontSize: '1.1rem',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Contest Creation Portal
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
          
          <p style={{ 
            fontSize: '1rem', 
            color: '#6b7280', 
            marginTop: '24px',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            fontWeight: 500,
          }}>
            Get started by providing the initial details needed to create a contest.
          </p>
        </div>

        {/* Form */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
            padding: '48px 40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Contest Name */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '1rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Contest Name
              </label>
              <input
                type="text"
                value={formData.contestName}
                onChange={(e) => handleInputChange('contestName')(e.target.value)}
                placeholder="Enter the contest name"
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
                  boxSizing: 'border-box',
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

            {/* Description */}
            <div>
              <RichTextEditor
                label="Description"
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Provide a brief description of the contest"
                maxLength={500}
                minRows={4}
              />
            </div>

            {/* Start Time */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '1rem',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                }}
              >
                Start Time
              </label>
              <DateTimePicker
                value={formData.start_time}
                onChange={(value) => handleInputChange('start_time')(value)}
              />
            </div>

            {/* Duration and Freeze Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label 
                  style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '1rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration')(parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="120"
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
                    boxSizing: 'border-box',
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
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px', margin: '8px 0 0 0' }}>
                  End time: {getEndTime().toLocaleString()}
                </p>
              </div>

              <div>
                <label 
                  style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '1rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  }}
                >
                  Freeze Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.freeze_time}
                  onChange={(e) => handleInputChange('freeze_time')(parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="30"
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
                    boxSizing: 'border-box',
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
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px', margin: '8px 0 0 0' }}>
                  Minutes before contest end to freeze leaderboard
                </p>
              </div>
            </div>


          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 32px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
              opacity: saving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!saving) {
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
            {saving && (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
            )}
            <span style={{ opacity: saving ? 0.8 : 1 }}>
              {saving ? 'Saving...' : 'Save Contest'}
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default CreateContestPage;