/**
 * Test Case Modal Component
 * Matches the design from screenshot 4 - Add Test Case dialog
 */

import React, { useState } from 'react';
import {
  Dialog,
  Button,
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface TestCase {
  id?: string;
  sample: boolean;
  input: string;
  output: string;
}

interface TestCaseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (testCase: TestCase) => void;
  testCase?: TestCase;
  problemId?: string;
}

const TestCaseModal: React.FC<TestCaseModalProps> = ({
  open,
  onClose,
  onSave,
  testCase,
  problemId,
}) => {
  const [formData, setFormData] = useState<TestCase>({
    id: testCase?.id,
    sample: testCase?.sample || false,
    input: testCase?.input || '',
    output: testCase?.output || '',
  });

  const isEditing = !!testCase?.id;

  // Reset form data when modal opens with different test case
  React.useEffect(() => {
    setFormData({
      id: testCase?.id,
      sample: testCase?.sample || false,
      input: testCase?.input || '',
      output: testCase?.output || '',
    });
  }, [testCase, open]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!problemId) {
      alert('Error: Problem ID is required');
      return;
    }

    try {
      setSaving(true);

      // Prepare test case data for API (only send fields supported by backend)
      const testCaseData = {
        input: formData.input,
        expected_output: formData.output,
        is_sample: formData.sample,
      };

      // Make API call to create or update test case
      const url = isEditing 
        ? `/api/admin/testcases/${testCase.id}` 
        : `/api/admin/problems/${problemId}/testcases`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCaseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} test case`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Transform API response back to frontend format
        const savedTestCase: TestCase = {
          id: result.data.id,
          sample: result.data.is_sample || false,
          input: result.data.input,
          output: result.data.expected_output,
        };
        
        onSave(savedTestCase);
        onClose();
      } else {
        throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} test case`);
      }
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} test case:`, error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof TestCase, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
        }
      }}
    >
      {/* Header */}
      <div style={{ padding: '48px 40px 0 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h1 style={{ 
              fontWeight: 700, 
              fontSize: '2rem',
              color: '#1d4ed8',
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              margin: 0,
            }}>
              {isEditing ? 'Edit Test Case' : 'Add Test Case'}
            </h1>
            <IconButton 
              onClick={onClose} 
              size="small"
              sx={{
                color: '#64748b',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                }
              }}
            >
              <Close />
            </IconButton>
          </div>
          
          <div style={{
            width: '60px',
            height: '4px',
            background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
            margin: '0 auto',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 40px' }}>
        {/* Sample Checkbox */}
        <div style={{ marginBottom: '24px' }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={formData.sample}
                onChange={(e) => handleInputChange('sample', e.target.checked)}
                sx={{
                  color: '#1d4ed8',
                  '&.Mui-checked': {
                    color: '#1d4ed8',
                  },
                }}
              />
            }
            label={
              <span style={{
                fontWeight: 600,
                color: '#374151',
                fontSize: '0.9rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}>
                Mark as Sample Test Case (Example)
              </span>
            }
          />
          <div style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginLeft: '32px',
          }}>
            Sample test cases are visible to participants as examples. They help users understand the input-output format and expected behavior.
          </div>
        </div>

        {/* Input Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block',
            marginBottom: '8px',
            fontWeight: 600, 
            color: '#374151',
            fontSize: '0.9rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Standard Input (STDIN)
          </label>
          <textarea
            value={formData.input}
            onChange={(e) => handleInputChange('input', e.target.value)}
            placeholder="Enter test input here..."
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '0.9rem',
              padding: '16px 18px',
              transition: 'all 0.2s ease',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
              resize: 'vertical',
              minHeight: '120px',
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

        {/* Output Section */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block',
            marginBottom: '8px',
            fontWeight: 600, 
            color: '#374151',
            fontSize: '0.9rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          }}>
            Expected Output (STDOUT)
          </label>
          <textarea
            value={formData.output}
            onChange={(e) => handleInputChange('output', e.target.value)}
            placeholder="Enter expected output here..."
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '0.9rem',
              padding: '16px 18px',
              transition: 'all 0.2s ease',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
              resize: 'vertical',
              minHeight: '120px',
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
      </div>

      {/* Footer */}
      <div style={{ padding: '0 40px 48px 40px' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '20px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
            }
          }}
        >
          {saving ? `${isEditing ? 'Updating' : 'Creating'} Test Case...` : `${isEditing ? 'Update' : 'Create'} Test Case`}
        </button>
      </div>
    </Dialog>
  );
};

export default TestCaseModal;