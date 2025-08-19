/**
 * Problem Detail Page
 * Matches the design from screenshot 3 - Problem management with Details and Test Cases tabs
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import { Add, Close, Edit, Delete } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import TestCaseModal from '../components/Admin/TestCaseModal';
import RichTextEditor from '../components/common/RichTextEditor';

interface TestCase {
  id: string;
  order: number;
  input: string;
  output: string;
  sample: boolean;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

const ProblemDetailPage: React.FC = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testCaseModalOpen, setTestCaseModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<TestCase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteProblemDialogOpen, setDeleteProblemDialogOpen] = useState(false);
  const [deletingProblem, setDeletingProblem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedProblem, setEditedProblem] = useState<Problem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const breadcrumbItems = [
    { label: 'Manage Problems', href: '/admin' },
    { label: problem?.title || 'Loading...' },
  ];

  useEffect(() => {
    const fetchProblemData = async () => {
      if (!problemId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch problem details
        const problemResponse = await fetch(`/api/admin/problems/${problemId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (problemResponse.ok) {
          const problemResult = await problemResponse.json();
          if (problemResult.success && problemResult.data) {
            const problemData = problemResult.data;
            setProblem({
              id: problemData.id,
              title: problemData.title,
              description: problemData.description,
              statement: problemData.description, // Using description as statement
              inputFormat: problemData.input_format,
              outputFormat: problemData.output_format,
              constraints: problemData.constraints,
              difficulty: problemData.difficulty || 'medium',
              tags: [], // Tags removed as requested
            });
          }
        } else {
          throw new Error('Failed to fetch problem details');
        }

        // Fetch test cases
        const testCasesResponse = await fetch(`/api/admin/problems/${problemId}/testcases`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (testCasesResponse.ok) {
          const testCasesResult = await testCasesResponse.json();
          if (testCasesResult.success && testCasesResult.data) {
            const transformedTestCases = testCasesResult.data.map((tc: any, index: number) => ({
              id: tc.id,
              order: index + 1,
              input: tc.input,
              output: tc.expected_output,
              tag: '', // Backend doesn't store tags, so use empty string
              sample: tc.is_sample || false,
              additional: false, // Backend doesn't store this field
              strength: 10, // Backend doesn't store strength, so use default
                    }));
            setTestCases(transformedTestCases);
          }
        } else {
          throw new Error('Failed to fetch test cases');
        }
      } catch (error) {
        console.error('Failed to fetch problem data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load problem data');
      } finally {
        setLoading(false);
      }
    };

    fetchProblemData();
  }, [problemId]);

  const handleEdit = () => {
    if (problem) {
      setEditedProblem({ ...problem });
      setEditMode(true);
      setSaveError(null);
      setSaveSuccess(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedProblem(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const validateProblemForm = (problem: Problem): string[] => {
    const errors: string[] = [];
    
    if (!problem.title.trim()) {
      errors.push('Problem title is required');
    } else if (problem.title.trim().length < 3) {
      errors.push('Problem title must be at least 3 characters long');
    }
    
    if (!problem.description.trim()) {
      errors.push('Problem description is required');
    } else if (problem.description.trim().length < 10) {
      errors.push('Problem description must be at least 10 characters long');
    }
    
    return errors;
  };

  const handleSaveProblem = async () => {
    if (!editedProblem || !problemId) return;

    // Validate the form
    const validationErrors = validateProblemForm(editedProblem);
    if (validationErrors.length > 0) {
      setSaveError(validationErrors.join('. '));
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/admin/problems/${problemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editedProblem.title,
          description: editedProblem.description,
          input_format: editedProblem.inputFormat,
          output_format: editedProblem.outputFormat,
          constraints: editedProblem.constraints,
          difficulty: editedProblem.difficulty,
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProblem(editedProblem);
          setEditMode(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error(result.message || 'Failed to update problem');
        }
      } else {
        throw new Error('Failed to update problem');
      }
    } catch (error) {
      console.error('Failed to save problem:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save problem');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFieldChange = (field: keyof Problem, value: string) => {
    if (editedProblem) {
      setEditedProblem({
        ...editedProblem,
        [field]: value
      });
    }
  };

  const handleRichTextChange = (field: keyof Problem) => (value: string) => {
    handleFieldChange(field, value);
  };

  const handlePreviewProblem = () => {
    setPreviewOpen(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleAddTestCase = (testCase: any) => {
    const newTestCase: TestCase = {
      id: testCase.id,
      input: testCase.input,
      output: testCase.output,
      sample: testCase.sample,
      order: testCases.length + 1,
    };
    setTestCases(prev => [...prev, newTestCase]);
  };

  const handleEditTestCase = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setTestCaseModalOpen(true);
  };

  const handleUpdateTestCase = (updatedTestCase: any) => {
    const updatedTC: TestCase = {
      id: updatedTestCase.id,
      input: updatedTestCase.input,
      output: updatedTestCase.output,
      sample: updatedTestCase.sample,
      order: editingTestCase?.order || 1,
    };
    setTestCases(prev => prev.map(tc => 
      tc.id === updatedTC.id ? updatedTC : tc
    ));
    setEditingTestCase(null);
  };

  const handleCloseModal = () => {
    setTestCaseModalOpen(false);
    setEditingTestCase(null);
  };

  const handleSaveTestCase = (testCase: any) => {
    if (editingTestCase) {
      handleUpdateTestCase(testCase);
    } else {
      handleAddTestCase(testCase);
    }
  };

  const handleDeleteTestCase = (testCase: TestCase) => {
    setTestCaseToDelete(testCase);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!testCaseToDelete) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/admin/testcases/${testCaseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete test case');
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove test case from state
        setTestCases(prev => prev.filter(tc => tc.id !== testCaseToDelete.id));
        setDeleteDialogOpen(false);
        setTestCaseToDelete(null);
      } else {
        throw new Error(result.message || 'Failed to delete test case');
      }
    } catch (error) {
      console.error('Failed to delete test case:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTestCaseToDelete(null);
  };

  const handleDeleteProblem = () => {
    setDeleteProblemDialogOpen(true);
  };

  const handleConfirmDeleteProblem = async () => {
    if (!problem) return;

    try {
      setDeletingProblem(true);

      const response = await fetch(`/api/admin/problems/${problem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hackathon_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete problem');
      }

      const result = await response.json();
      
      if (result.success) {
        // Navigate back to contest page after successful deletion
        navigate(-1);
      } else {
        throw new Error(result.message || 'Failed to delete problem');
      }
    } catch (error) {
      console.error('Failed to delete problem:', error);
      alert(`Error: ${error.message}`);
      setDeleteProblemDialogOpen(false);
    } finally {
      setDeletingProblem(false);
    }
  };

  const handleCancelDeleteProblem = () => {
    setDeleteProblemDialogOpen(false);
  };


  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          padding: '32px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #1d4ed8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          padding: '32px 16px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div 
            style={{ 
              padding: '16px 20px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span><strong>Error:</strong> {error}</span>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            Problem Management
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
            {problem?.title || 'Loading Problem...'}
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
        </div>

        {/* Navigation Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginBottom: '24px',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setSelectedTab(0)}
            style={{
              background: selectedTab === 0 ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : '#ffffff',
              color: selectedTab === 0 ? 'white' : '#374151',
              border: selectedTab === 0 ? 'none' : '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: selectedTab === 0 ? '0 4px 12px rgba(29, 78, 216, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
            }}
          >
            Details
          </button>
          <button
            onClick={() => setSelectedTab(1)}
            style={{
              background: selectedTab === 1 ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : '#ffffff',
              color: selectedTab === 1 ? 'white' : '#374151',
              border: selectedTab === 1 ? 'none' : '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: selectedTab === 1 ? '0 4px 12px rgba(29, 78, 216, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
            }}
          >
            Test Cases
          </button>
        </div>

        {/* Main Content */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
            minHeight: '500px',
          }}
        >
          {selectedTab === 0 ? (
            // Details Tab
            <div style={{ padding: '48px 40px' }}>
              {/* Header with Edit Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 600, 
                  color: '#1f2937',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  margin: 0,
                }}>
                  Problem Details
                </h3>
                {!editMode && (
                  <button
                    onClick={handleEdit}
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Edit Problem
                  </button>
                )}
              </div>

              {/* Success/Error Messages */}
              {saveSuccess && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: '#166534',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}>
                  ✓ Problem updated successfully!
                </div>
              )}

              {saveError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}>
                  Error: {saveError}
                </div>
              )}

              {editMode && editedProblem ? (
                // Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Title */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.9rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Problem Title
                    </label>
                    <input
                      type="text"
                      value={editedProblem.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      style={{
                        width: '100%',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        padding: '12px 16px',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
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

                  {/* Description */}
                  <div>
                    <RichTextEditor
                      label="Problem Description"
                      value={editedProblem.description}
                      onChange={handleRichTextChange('description')}
                      placeholder="Describe the problem in detail..."
                      minRows={6}
                    />
                  </div>

                  {/* Input Format */}
                  <div>
                    <RichTextEditor
                      label="Input Format"
                      value={editedProblem.inputFormat}
                      onChange={handleRichTextChange('inputFormat')}
                      placeholder="Describe the input format..."
                      minRows={3}
                    />
                  </div>

                  {/* Output Format */}
                  <div>
                    <RichTextEditor
                      label="Output Format"
                      value={editedProblem.outputFormat}
                      onChange={handleRichTextChange('outputFormat')}
                      placeholder="Describe the expected output format..."
                      minRows={3}
                    />
                  </div>

                  {/* Constraints */}
                  <div>
                    <RichTextEditor
                      label="Constraints"
                      value={editedProblem.constraints}
                      onChange={handleRichTextChange('constraints')}
                      placeholder="List the constraints..."
                      minRows={4}
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.9rem',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}>
                      Difficulty Level
                    </label>
                    <select
                      value={editedProblem.difficulty}
                      onChange={(e) => handleFieldChange('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                      style={{
                        width: '100%',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        padding: '12px 16px',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        cursor: 'pointer',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1d4ed8';
                        e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saveLoading}
                      style={{
                        background: '#ffffff',
                        color: '#64748b',
                        border: '2px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        opacity: saveLoading ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!saveLoading) {
                          e.currentTarget.style.background = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProblem}
                      disabled={saveLoading}
                      style={{
                        background: saveLoading ? '#9ca3af' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 32px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        boxShadow: saveLoading ? 'none' : '0 4px 12px rgba(29, 78, 216, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!saveLoading) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!saveLoading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
                        }
                      }}
                    >
                      {saveLoading && (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }}
                        ></div>
                      )}
                      {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {problem ? (
                    <>
                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Title
                        </h4>
                        <p style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          {problem.title}
                        </p>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Description
                        </h4>
                        <div style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}>
                          {problem.description ? (
                            <div style={{
                              '& h1, & h2, & h3, & h4, & h5, & h6': {
                                color: '#1e293b',
                                marginTop: '1rem',
                                marginBottom: '0.5rem',
                              },
                              '& p': {
                                marginBottom: '1rem',
                              },
                              '& ul, & ol': {
                                paddingLeft: '2rem',
                                marginBottom: '1rem',
                              },
                              '& code': {
                                backgroundColor: '#e2e8f0',
                                padding: '0.125rem 0.25rem',
                                borderRadius: '0.25rem',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                              },
                              '& pre': {
                                backgroundColor: '#1f2937',
                                color: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                overflow: 'auto',
                                marginBottom: '1rem',
                              },
                              '& pre code': {
                                backgroundColor: 'transparent',
                                color: 'inherit',
                                padding: 0,
                              },
                              '& a': {
                                color: '#1d4ed8',
                                textDecoration: 'underline',
                              },
                              '& strong': {
                                fontWeight: 600,
                              },
                              '& em': {
                                fontStyle: 'italic',
                              },
                            } as React.CSSProperties}>
                              <ReactMarkdown>{problem.description}</ReactMarkdown>
                            </div>
                          ) : (
                            <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No description provided</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Input Format
                        </h4>
                        <div style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}>
                          {problem.inputFormat ? (
                            <ReactMarkdown>{problem.inputFormat}</ReactMarkdown>
                          ) : (
                            <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Not specified</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Output Format
                        </h4>
                        <div style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}>
                          {problem.outputFormat ? (
                            <ReactMarkdown>{problem.outputFormat}</ReactMarkdown>
                          ) : (
                            <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Not specified</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Constraints
                        </h4>
                        <div style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}>
                          {problem.constraints ? (
                            <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                          ) : (
                            <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No constraints specified</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                        }}>
                          Difficulty Level
                        </h4>
                        <div style={{
                          color: '#1f2937',
                          fontSize: '1rem',
                          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          display: 'inline-block',
                        }}>
                          <span
                            style={{
                              backgroundColor: problem.difficulty === 'easy' ? '#10b981' : 
                                             problem.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          >
                            {problem.difficulty}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{
                      color: '#6b7280',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      fontSize: '1rem',
                    }}>
                      Loading problem details...
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Test Cases Tab
            <div style={{ padding: '48px 40px' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: '#6b7280',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  marginBottom: '16px',
                }}>
                  Add test cases to judge the correctness of a user's code. Each test case should provide standard input (STDIN) and expected output (STDOUT) that will be used to validate submissions.
                </p>

                {testCases.length === 0 && (
                  <div 
                    style={{ 
                      padding: '16px 20px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fed7aa',
                      borderRadius: '12px',
                      marginBottom: '24px',
                      color: '#a16207',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    ⚠️ You do not have any test cases for this problem. Add at least one test case.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    onClick={() => setTestCaseModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
                    }}
                  >
                    <Add style={{ fontSize: '20px' }} />
                    Add Test Case
                  </button>
                </div>
              </div>


              {/* Test Cases Table */}
              {testCases.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Input Preview</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Output Preview</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Sample</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testCases.map((testCase) => (
                        <TableRow key={testCase.id}>
                          <TableCell>{testCase.order}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {testCase.input.length > 30 ? testCase.input.substring(0, 30) + '...' : testCase.input}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {testCase.output.length > 30 ? testCase.output.substring(0, 30) + '...' : testCase.output}
                          </TableCell>
                          <TableCell>
                            {testCase.sample && (
                              <Box sx={{ color: '#059669', fontSize: '0.75rem' }}>✓ Sample</Box>
                            )}
                            {!testCase.sample && (
                              <Box sx={{ color: '#6b7280', fontSize: '0.75rem' }}>Hidden</Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <IconButton
                                size="small"
                                onClick={() => handleEditTestCase(testCase)}
                                sx={{
                                  color: '#1d4ed8',
                                  '&:hover': {
                                    backgroundColor: '#e0e7ff',
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteTestCase(testCase)}
                                sx={{
                                  color: '#dc2626',
                                  '&:hover': {
                                    backgroundColor: '#fee2e2',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '48px 0',
                  color: '#94a3b8',
                }}>
                  <p style={{ 
                    fontSize: '1rem',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    margin: 0,
                  }}>No test cases have been added yet</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={handlePreviewProblem}
              style={{
                background: '#ffffff',
                color: '#64748b',
                border: '2px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              Preview Problem
            </button>
            <button
              onClick={handleDeleteProblem}
              disabled={deletingProblem}
              style={{
                background: '#ffffff',
                color: '#dc2626',
                border: '2px solid #fecaca',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: deletingProblem ? 'not-allowed' : 'pointer',
                opacity: deletingProblem ? 0.7 : 1,
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (!deletingProblem) {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#f87171';
                }
              }}
              onMouseLeave={(e) => {
                if (!deletingProblem) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#fecaca';
                }
              }}
            >
              {deletingProblem ? 'Deleting...' : 'Delete Problem'}
            </button>
          </div>
          <button
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 78, 216, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.25)';
            }}
          >
            Save Changes
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <div 
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
              margin: '32px auto 24px',
              maxWidth: '400px',
            }}
          ></div>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            Need to return to dashboard?{' '}
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                padding: '0',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.color = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.color = '#1d4ed8';
              }}
            >
              Click here
            </button>
          </p>
        </div>
      </div>

      {/* Test Case Modal */}
      <TestCaseModal
        open={testCaseModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTestCase}
        testCase={editingTestCase}
        problemId={problemId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          fontSize: '1.5rem',
          color: '#dc2626',
          textAlign: 'center',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          paddingBottom: '8px'
        }}>
          Delete Test Case
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', padding: '16px 24px' }}>
          <Typography sx={{ 
            fontSize: '1rem',
            color: '#374151',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '16px'
          }}>
            Are you sure you want to delete this test case?
          </Typography>
          {testCaseToDelete && (
            <Box sx={{ 
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              textAlign: 'left'
            }}>
              <div><strong>Input:</strong> {testCaseToDelete.input || '(empty)'}</div>
              <div><strong>Output:</strong> {testCaseToDelete.output || '(empty)'}</div>
              <div><strong>Sample:</strong> {testCaseToDelete.sample ? 'Yes' : 'No'}</div>
            </Box>
          )}
          <Typography sx={{ 
            fontSize: '0.875rem',
            color: '#dc2626',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginTop: '16px',
            fontWeight: 500
          }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px', gap: '12px' }}>
          <Button
            onClick={handleCancelDelete}
            disabled={deleting}
            sx={{
              color: '#64748b',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 500,
              textTransform: 'none',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              '&:hover': {
                backgroundColor: '#f8f9fa',
                border: '2px solid #94a3b8',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={deleting}
            sx={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              textTransform: 'none',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: '#9ca3af',
                color: '#ffffff',
              },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Problem Confirmation Dialog */}
      <Dialog
        open={deleteProblemDialogOpen}
        onClose={handleCancelDeleteProblem}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          fontSize: '1.5rem',
          color: '#dc2626',
          textAlign: 'center',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          paddingBottom: '8px'
        }}>
          Delete Problem
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', padding: '16px 24px' }}>
          <Typography sx={{ 
            fontSize: '1.1rem',
            color: '#374151',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            Are you sure you want to delete this problem?
          </Typography>
          {problem && (
            <Box sx={{ 
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '20px'
            }}>
              <Typography sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                {problem.title}
              </Typography>
              <Typography sx={{ 
                fontSize: '0.9rem',
                color: '#6b7280',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Problem Letter: {problem.problem_letter || 'N/A'}
              </Typography>
              <Typography sx={{ 
                fontSize: '0.9rem',
                color: '#6b7280',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Difficulty: {problem.difficulty || 'N/A'}
              </Typography>
              <Typography sx={{ 
                fontSize: '0.9rem',
                color: '#6b7280',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Test Cases: {testCases.length}
              </Typography>
            </Box>
          )}
          <Typography sx={{ 
            fontSize: '0.95rem',
            color: '#dc2626',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            ⚠️ This will permanently delete:
          </Typography>
          <Typography sx={{ 
            fontSize: '0.875rem',
            color: '#dc2626',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            marginBottom: '16px'
          }}>
            • The problem and all its details<br/>
            • All {testCases.length} test cases<br/>
            • All submissions for this problem<br/>
            • This action cannot be undone
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px', gap: '12px' }}>
          <Button
            onClick={handleCancelDeleteProblem}
            disabled={deletingProblem}
            sx={{
              color: '#64748b',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 500,
              textTransform: 'none',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              '&:hover': {
                backgroundColor: '#f8f9fa',
                border: '2px solid #94a3b8',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteProblem}
            disabled={deletingProblem}
            sx={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              textTransform: 'none',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
              '&:disabled': {
                backgroundColor: '#9ca3af',
                color: '#ffffff',
              },
            }}
          >
            {deletingProblem ? 'Deleting Problem...' : 'Delete Problem'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Problem Modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '95vh',
            width: '90vw',
            maxWidth: '1200px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          color: '#1f2937',
          fontWeight: 600,
        }}>
          Problem Preview
          <IconButton onClick={() => setPreviewOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {problem && (
            <Box sx={{ p: 4 }}>
              {/* Problem Title */}
              <Typography variant="h4" sx={{ mb: 3, color: '#1f2937', fontWeight: 600 }}>
                {problem.title}
              </Typography>

              {/* Problem Description */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#374151', fontWeight: 600 }}>
                  Description
                </Typography>
                <Box
                  sx={{
                    backgroundColor: '#f8fafc',
                    padding: 3,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      color: '#1e293b',
                      marginTop: '1rem',
                      marginBottom: '0.5rem',
                    },
                    '& p': {
                      marginBottom: '1rem',
                    },
                    '& ul, & ol': {
                      paddingLeft: '2rem',
                      marginBottom: '1rem',
                    },
                    '& code': {
                      backgroundColor: '#e2e8f0',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.25rem',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                    '& pre': {
                      backgroundColor: '#1f2937',
                      color: '#f8fafc',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      overflow: 'auto',
                      marginBottom: '1rem',
                    },
                    '& pre code': {
                      backgroundColor: 'transparent',
                      color: 'inherit',
                      padding: 0,
                    },
                    '& a': {
                      color: '#1d4ed8',
                      textDecoration: 'underline',
                    },
                    '& strong': {
                      fontWeight: 600,
                    },
                    '& em': {
                      fontStyle: 'italic',
                    },
                  }}
                >
                  <ReactMarkdown>{problem.description}</ReactMarkdown>
                </Box>
              </Box>

              {/* Input Format */}
              {problem.inputFormat && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#374151', fontWeight: 600 }}>
                    Input Format
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#f8fafc',
                      padding: 3,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <ReactMarkdown>{problem.inputFormat}</ReactMarkdown>
                  </Box>
                </Box>
              )}

              {/* Output Format */}
              {problem.outputFormat && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#374151', fontWeight: 600 }}>
                    Output Format
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#f8fafc',
                      padding: 3,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <ReactMarkdown>{problem.outputFormat}</ReactMarkdown>
                  </Box>
                </Box>
              )}

              {/* Constraints */}
              {problem.constraints && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#374151', fontWeight: 600 }}>
                    Constraints
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#f8fafc',
                      padding: 3,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={() => setPreviewOpen(false)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ProblemDetailPage;