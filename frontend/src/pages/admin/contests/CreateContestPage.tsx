/**
 * Create Contest Page
 * Retro styling to match Hack The Valley theme
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import apiService from '../../../services/api';
import RichTextEditor from '../../../components/common/RichTextEditor';
import DateTimePicker from '../../../components/common/DateTimePicker';

interface ContestFormData {
  contestName: string;
  description: string;
  duration: number;
  freeze_time: number;
}

const CreateContestPage: React.FC = () => {
  const navigate = useNavigate();
  useAdminAuth();
  
  const [formData, setFormData] = useState<ContestFormData>({
    contestName: '',
    description: '',
    duration: 0,
    freeze_time: 0,
  });
  
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof ContestFormData) => (value: string | number) => {
    setFormData(prev => {
      const next: ContestFormData = { ...prev, [field]: value as any };

      if (field === 'duration' && Number(value) === 0) {
        next.freeze_time = 0;
      }

      return next;
    });
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
      
      if (formData.duration < 0) {
        throw new Error('Duration cannot be negative');
      }

      if (formData.duration === 0 && formData.freeze_time > 0) {
        throw new Error('Freeze time is only available when a duration is set');
      }

      if (formData.duration > 0 && formData.freeze_time > formData.duration) {
        throw new Error('Freeze time cannot exceed the planned duration');
      }

      const contestData = {
        contest_name: formData.contestName.trim(),
        description: formData.description,
        start_time: null,
        duration: formData.duration === 0 ? null : formData.duration,
        freeze_time: formData.duration === 0 ? 0 : formData.freeze_time,
        manual_control: true,
        is_active: false
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
          padding: '32px 16px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
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
              Create Contest
            </h2>
          </div>

          {/* Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '8px 8px 0px #212529',
              padding: '32px 24px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Contest Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', cursive",
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
                    border: '3px solid #212529',
                    fontSize: '0.8rem',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    fontFamily: "system-ui, sans-serif",
                    boxSizing: 'border-box',
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

              {/* Scheduling */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', cursive",
                  }}
                >
                  Contest Scheduling
                </label>
                <div
                  style={{
                    background: '#E0E7FF',
                    border: '3px dashed #212529',
                    padding: '16px',
                    fontSize: '0.65rem',
                    lineHeight: 1.6,
                    color: '#1f2937',
                    boxShadow: '4px 4px 0px #212529'
                  }}
                >
                  Manual control is enabled. Start and end this contest from the admin dashboard when the teams are ready.
                </div>
              </div>

              {/* Duration */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', cursive",
                  }}
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration')(parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="120"
                  style={{
                    width: '100%',
                    border: '3px solid #212529',
                    fontSize: '0.8rem',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    fontFamily: "system-ui, sans-serif",
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '8px', lineHeight: '1.6' }}>
                  {formData.duration === 0
                    ? 'Manual mode: duration and end time will be determined when you close the contest.'
                    : `Planned duration: ${formData.duration} minutes.`}
                </p>
              </div>

              {/* Freeze Time */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', cursive",
                  }}
                >
                  Freeze Time (min)
                </label>
                <input
                  type="number"
                  value={formData.freeze_time}
                  onChange={(e) => handleInputChange('freeze_time')(parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="30"
                  style={{
                    width: '100%',
                    border: '3px solid #212529',
                    fontSize: '0.8rem',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    fontFamily: "system-ui, sans-serif",
                    boxSizing: 'border-box',
                  }}
                  disabled={saving || formData.duration === 0}
                />
                <p style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '8px', lineHeight: '1.6' }}>
                  {formData.duration === 0
                    ? 'Set a duration above to enable leaderboard freeze functionality.'
                    : 'Minutes before the planned end to freeze the leaderboard.'}
                </p>
              </div>
            </div>


          </div>
        </div>

          {/* Buttons */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => navigate('/admin/contests')}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#ffffff',
                color: '#212529',
                boxShadow: '4px 4px 0px #212529',
                fontSize: '0.7rem',
                padding: '12px 20px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                border: '4px solid #212529',
                backgroundColor: saving ? '#6b7280' : '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '0.7rem',
                padding: '12px 24px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #212529';
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                }
              }}
              onMouseDown={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translate(6px, 6px)';
                  e.currentTarget.style.boxShadow = '0px 0px 0px #212529';
                }
              }}
              onMouseUp={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translate(2px, 2px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #212529';
                }
              }}
            >
              {saving && (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              {saving ? 'Saving...' : 'Save Contest'}
            </button>
          </div>
      </div>
    </>
  );
};


export default CreateContestPage;
