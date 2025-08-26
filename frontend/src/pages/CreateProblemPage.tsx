import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import RichTextEditor from '../components/common/RichTextEditor';
import apiService from '../services/api';

interface ProblemFormData {
  problemName: string;
  description: string;
  problemStatement: string;
  inputFormat: string;
  constraints: string;
  outputFormat: string;
  points: number;
}

const CreateProblemPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProblemFormData>({
    problemName: '',
    description: '',
    problemStatement: '',
    inputFormat: '',
    constraints: '',
    outputFormat: '',
    points: 1,
  });
  const [saving, setSaving] = useState(false);

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Manage Problems', href: '/admin/problems' },
    { label: 'Create' },
  ];

  const handleInputChange = (field: keyof ProblemFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      console.log('Fetching contests using API service...');
      const contestsResult = await apiService.getAdminContests();
      console.log('Contests response:', contestsResult);

      let contestId;
      if (contestsResult.success && contestsResult.data && contestsResult.data.length > 0) {
        contestId = contestsResult.data[0].id;
        console.log('Using contest ID:', contestId);
      } else {
        throw new Error('No contests available. Please create a contest first.');
      }

      const problemData = {
        title: formData.problemName,
        description: formData.problemStatement || formData.description, 
        input_format: formData.inputFormat,
        output_format: formData.outputFormat,
        constraints: formData.constraints,
        sample_input: '',
        sample_output: '', 
        time_limit: 2000, 
        memory_limit: 256, 
        difficulty: 'medium', 
        points_value: formData.points 
      };

      console.log('Creating problem with data:', problemData);
      const result = await apiService.createProblem(contestId, problemData);
      console.log('Create problem response:', result);
      
      if (result.success) {
        console.log('Problem created successfully:', result.data);
        navigate('/admin/dashboard');
      } else {
        throw new Error(result.message || 'Failed to create problem');
      }
    } catch (error) {
      console.error('Failed to save problem:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
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
        <Breadcrumb items={breadcrumbItems} />

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
            Create Problem
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
            Problem Creation Portal
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
            Get started by providing the initial details needed to create a problem.
          </p>
        </div>

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
                Problem Name
              </label>
              <input
                type="text"
                value={formData.problemName}
                onChange={(e) => handleInputChange('problemName')(e.target.value)}
                placeholder="Enter the problem name"
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

            <div>
              <RichTextEditor
                label="Description"
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Write a short summary about the problem"
                maxLength={140}
                minRows={3}
              />
            </div>

            <div>
              <RichTextEditor
                label="Problem Statement"
                value={formData.problemStatement}
                onChange={handleInputChange('problemStatement')}
                placeholder="Describe the problem in detail..."
                maxLength={1000}
                minRows={6}
              />
            </div>

            <div>
              <RichTextEditor
                label="Input Format"
                value={formData.inputFormat}
                onChange={handleInputChange('inputFormat')}
                placeholder="Describe the input format..."
                minRows={4}
              />
            </div>

            <div>
              <RichTextEditor
                label="Constraints"
                value={formData.constraints}
                onChange={handleInputChange('constraints')}
                placeholder="List the constraints..."
                minRows={4}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Points Value
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.points}
                onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                placeholder="Enter points for this problem"
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
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '4px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Teams will earn partial points based on test cases passed (e.g., 10/15 test cases = {formData.points * (10/15)} points)
              </p>
            </div>

            <div>
              <RichTextEditor
                label="Output Format"
                value={formData.outputFormat}
                onChange={handleInputChange('outputFormat')}
                placeholder="Describe the expected output format..."
                minRows={4}
              />
            </div>

          </div>
        </div>

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
              {saving ? 'Saving...' : 'Save Problem'}
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default CreateProblemPage;