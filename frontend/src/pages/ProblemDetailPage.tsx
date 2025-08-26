/**
 * Problem Detail Page
 * Matches the design from screenshot 3 - Problem management with Details and Test Cases tabs
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import TestCaseModal from '../components/Admin/TestCaseModal';
import RichTextEditor from '../components/common/RichTextEditor';
import '../styles/theme.css';

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
      <div className="full-height flex-center" style={{ backgroundColor: 'var(--background-default)' }}>
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-default)', padding: 'var(--spacing-xl) var(--spacing-md)' }}>
        <div className="container">
          <div className="alert alert-error">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>Error:</strong> {error}</span>
              <button
                onClick={() => window.location.reload()}
                className="btn-text"
                style={{
                  color: 'var(--contest-wrong-answer)',
                  textDecoration: 'underline',
                  padding: 0,
                  minHeight: 'auto',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-default)', padding: 'var(--spacing-xl) var(--spacing-md)' }}>
      <div className="container">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 style={{ 
            color: 'var(--primary-main)',
            marginBottom: 'var(--spacing-md)',
          }}>
            Problem Management
          </h1>
          
          <h2 style={{ 
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 'var(--spacing-md)',
          }}>
            {problem?.title || 'Loading Problem...'}
          </h2>
          
          <div style={{
            width: '80px',
            height: '4px',
            backgroundColor: 'var(--primary-main)',
            margin: '0 auto',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-sm)',
          }}></div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-4" style={{ gap: 'var(--spacing-sm)' }}>
          <button
            onClick={() => setSelectedTab(0)}
            className={selectedTab === 0 ? 'btn btn-primary' : 'btn btn-outlined'}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              fontSize: '1rem',
            }}
          >
            Details
          </button>
          <button
            onClick={() => setSelectedTab(1)}
            className={selectedTab === 1 ? 'btn btn-primary' : 'btn btn-outlined'}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              fontSize: '1rem',
            }}
          >
            Test Cases
          </button>
        </div>

        {/* Main Content */}
        <div className="card" style={{ minHeight: '500px' }}>
          {selectedTab === 0 ? (
            // Details Tab
            <div className="card-content" style={{ padding: 'var(--spacing-xl)' }}>
              {/* Header with Edit Button */}
              <div className="flex justify-between align-center mb-4">
                <h3 className="card-title">Problem Details</h3>
                {!editMode && (
                  <button
                    onClick={handleEdit}
                    className="btn btn-primary"
                    style={{ fontSize: '0.9rem' }}
                  >
                    Edit Problem
                  </button>
                )}
              </div>

              {/* Success/Error Messages */}
              {saveSuccess && (
                <div className="alert alert-success">
                  ✓ Problem updated successfully!
                </div>
              )}

              {saveError && (
                <div className="alert alert-error">
                  Error: {saveError}
                </div>
              )}

              {editMode && editedProblem ? (
                // Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                  {/* Title */}
                  <div className="form-group">
                    <label className="form-label">Problem Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editedProblem.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
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
                  <div className="form-group">
                    <label className="form-label">Difficulty Level</label>
                    <select
                      className="form-control"
                      value={editedProblem.difficulty}
                      onChange={(e) => handleFieldChange('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions" style={{ marginTop: 'var(--spacing-sm)' }}>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saveLoading}
                      className="btn btn-outlined"
                      style={{
                        opacity: saveLoading ? 0.5 : 1,
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProblem}
                      disabled={saveLoading}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: saveLoading ? '#9ca3af' : undefined,
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                      }}
                    >
                      {saveLoading && (
                        <div className="spinner" style={{ 
                          width: '16px', 
                          height: '16px',
                          borderWidth: '2px',
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          borderTopColor: 'white',
                        }}></div>
                      )}
                      {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                  {problem ? (
                    <>
                      <div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: 'var(--spacing-sm)',
                        }}>
                          Title
                        </h4>
                        <p style={{
                          color: 'var(--text-primary)',
                          fontSize: '1rem',
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
                          color: 'var(--text-primary)',
                          marginBottom: 'var(--spacing-sm)',
                        }}>
                          Description
                        </h4>
                        <div className="bg-light" style={{
                          color: 'var(--text-primary)',
                          fontSize: '1rem',
                          lineHeight: 1.5,
                          padding: 'var(--spacing-md)',
                          borderRadius: 'var(--border-radius)',
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
                          color: 'var(--text-primary)',
                          marginBottom: 'var(--spacing-sm)',
                        }}>
                          Difficulty Level
                        </h4>
                        <div>
                          <span
                            className={`chip ${
                              problem.difficulty === 'easy' ? 'chip-success' : 
                              problem.difficulty === 'medium' ? 'chip-warning' : 'chip-error'
                            }`}
                            style={{
                              fontSize: '0.875rem',
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
            <div className="card-content" style={{ padding: 'var(--spacing-xl)' }}>
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--spacing-md)',
                }}>
                  Add test cases to judge the correctness of a user's code. Each test case should provide standard input (STDIN) and expected output (STDOUT) that will be used to validate submissions.
                </p>

                {testCases.length === 0 && (
                  <div className="alert alert-warning">
                    Warning: You do not have any test cases for this problem. Add at least one test case.
                  </div>
                )}

                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setTestCaseModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    ➕ Add Test Case
                  </button>
                </div>
              </div>


              {/* Test Cases Table */}
              {testCases.length > 0 ? (
                <div className="card" style={{ marginTop: '16px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Input Preview</th>
                        <th>Output Preview</th>
                        <th>Sample</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testCases.map((testCase) => (
                        <tr key={testCase.id}>
                          <td>{testCase.order}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {testCase.input.length > 30 ? testCase.input.substring(0, 30) + '...' : testCase.input}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {testCase.output.length > 30 ? testCase.output.substring(0, 30) + '...' : testCase.output}
                          </td>
                          <td>
                            {testCase.sample ? (
                              <span className="chip chip-success" style={{ fontSize: '0.75rem' }}>✓ Sample</span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Hidden</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleEditTestCase(testCase)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary-main)',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--border-radius)',
                                  fontSize: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  transition: 'background-color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#e0e7ff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Edit test case"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTestCase(testCase)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--contest-wrong-answer)',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--border-radius)',
                                  fontSize: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  transition: 'background-color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Delete test case"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ 
                  padding: 'var(--spacing-xl) 0',
                  color: 'var(--text-secondary)',
                }}>
                  <p style={{ 
                    fontSize: '1rem',
                    margin: 0,
                  }}>No test cases have been added yet</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between align-center mt-5">
          <div className="flex" style={{ gap: 'var(--spacing-md)' }}>
            <button
              onClick={handlePreviewProblem}
              className="btn btn-outlined"
            >
              Preview Problem
            </button>
            <button
              onClick={handleDeleteProblem}
              disabled={deletingProblem}
              className="btn"
              style={{
                backgroundColor: 'var(--background-paper)',
                color: 'var(--contest-wrong-answer)',
                border: '2px solid #fecaca',
                opacity: deletingProblem ? 0.7 : 1,
                cursor: deletingProblem ? 'not-allowed' : 'pointer',
              }}
            >
              {deletingProblem ? 'Deleting...' : 'Delete Problem'}
            </button>
          </div>
          <button className="btn btn-primary">
            Save Changes
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <div 
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
              margin: 'var(--spacing-xl) auto var(--spacing-lg)',
              maxWidth: '400px',
            }}
          ></div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Need to return to dashboard?{' '}
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="btn-text"
              style={{
                color: 'var(--primary-main)',
                padding: 0,
                fontSize: '0.9rem',
                minHeight: 'auto',
                textDecoration: 'underline',
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
      {deleteDialogOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelDelete}
        >
          <div 
            className="card"
            style={{
              width: '100%',
              maxWidth: '500px',
              margin: '20px',
              backgroundColor: 'var(--background-paper)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header text-center">
              <h3 style={{ 
                color: 'var(--contest-wrong-answer)',
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                Delete Test Case
              </h3>
            </div>
            <div className="card-content text-center">
              <p style={{ 
                fontSize: '1rem',
                color: 'var(--text-primary)',
                marginBottom: '16px'
              }}>
                Are you sure you want to delete this test case?
              </p>
              {testCaseToDelete && (
                <div style={{ 
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--border-radius)',
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  marginBottom: '16px'
                }}>
                  <div><strong>Input:</strong> {testCaseToDelete.input || '(empty)'}</div>
                  <div><strong>Output:</strong> {testCaseToDelete.output || '(empty)'}</div>
                  <div><strong>Sample:</strong> {testCaseToDelete.sample ? 'Yes' : 'No'}</div>
                </div>
              )}
              <p style={{ 
                fontSize: '0.875rem',
                color: 'var(--contest-wrong-answer)',
                marginTop: '16px',
                fontWeight: 500
              }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="card-actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="btn btn-outlined"
                style={{
                  opacity: deleting ? 0.5 : 1,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  backgroundColor: deleting ? '#9ca3af' : 'var(--contest-wrong-answer)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = 'var(--contest-wrong-answer)';
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Problem Confirmation Dialog */}
      {deleteProblemDialogOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelDeleteProblem}
        >
          <div 
            className="card"
            style={{
              width: '100%',
              maxWidth: '600px',
              margin: '20px',
              backgroundColor: 'var(--background-paper)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header text-center">
              <h3 style={{ 
                color: 'var(--contest-wrong-answer)',
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                Delete Problem
              </h3>
            </div>
            <div className="card-content text-center">
              <p style={{ 
                fontSize: '1.1rem',
                color: 'var(--text-primary)',
                marginBottom: '20px',
                fontWeight: 500
              }}>
                Are you sure you want to delete this problem?
              </p>
              {problem && (
                <div style={{ 
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--border-radius-lg)',
                  padding: '20px',
                  textAlign: 'left',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ 
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                  }}>
                    {problem.title}
                  </h4>
                  <p style={{ 
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px'
                  }}>
                    Problem ID: {problem.id || 'N/A'}
                  </p>
                  <p style={{ 
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px'
                  }}>
                    Difficulty: {problem.difficulty || 'N/A'}
                  </p>
                  <p style={{ 
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    margin: 0
                  }}>
                    Test Cases: {testCases.length}
                  </p>
                </div>
              )}
              <p style={{ 
                fontSize: '0.95rem',
                color: 'var(--contest-wrong-answer)',
                fontWeight: 600,
                marginBottom: '8px'
              }}>
                Warning: This will permanently delete:
              </p>
              <div style={{ 
                fontSize: '0.875rem',
                color: 'var(--contest-wrong-answer)',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                <p>• The problem and all its details</p>
                <p>• All {testCases.length} test cases</p>
                <p>• All submissions for this problem</p>
                <p>• This action cannot be undone</p>
              </div>
            </div>
            <div className="card-actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={handleCancelDeleteProblem}
                disabled={deletingProblem}
                className="btn btn-outlined"
                style={{
                  opacity: deletingProblem ? 0.5 : 1,
                  cursor: deletingProblem ? 'not-allowed' : 'pointer',
                  padding: '10px 20px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteProblem}
                disabled={deletingProblem}
                style={{
                  backgroundColor: deletingProblem ? '#9ca3af' : 'var(--contest-wrong-answer)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: deletingProblem ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!deletingProblem) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deletingProblem) {
                    e.currentTarget.style.backgroundColor = 'var(--contest-wrong-answer)';
                  }
                }}
              >
                {deletingProblem ? 'Deleting Problem...' : 'Delete Problem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Problem Modal */}
      {previewOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={() => setPreviewOpen(false)}
        >
          <div 
            className="card"
            style={{
              width: '100%',
              maxWidth: '1200px',
              maxHeight: '95vh',
              backgroundColor: 'var(--background-paper)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="card-header" 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <h3 style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                margin: 0,
              }}>
                Problem Preview
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--border-radius)',
                }}
                title="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="card-content">
              {problem && (
                <div>
                  {/* Problem Title */}
                  <h1 style={{ 
                    marginBottom: '24px', 
                    color: 'var(--text-primary)', 
                    fontWeight: 600 
                  }}>
                    {problem.title}
                  </h1>

                  {/* Problem Description */}
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ 
                      marginBottom: '16px', 
                      color: 'var(--text-primary)', 
                      fontWeight: 600 
                    }}>
                      Description
                    </h3>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '24px',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid #e2e8f0',
                    }}>
                      <ReactMarkdown>{problem.description}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Input Format */}
                  {problem.inputFormat && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        marginBottom: '16px', 
                        color: 'var(--text-primary)', 
                        fontWeight: 600 
                      }}>
                        Input Format
                      </h3>
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid #e2e8f0',
                      }}>
                        <ReactMarkdown>{problem.inputFormat}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Output Format */}
                  {problem.outputFormat && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        marginBottom: '16px', 
                        color: 'var(--text-primary)', 
                        fontWeight: 600 
                      }}>
                        Output Format
                      </h3>
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid #e2e8f0',
                      }}>
                        <ReactMarkdown>{problem.outputFormat}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {problem.constraints && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        marginBottom: '16px', 
                        color: 'var(--text-primary)', 
                        fontWeight: 600 
                      }}>
                        Constraints
                      </h3>
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid #e2e8f0',
                      }}>
                        <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div 
              className="card-actions" 
              style={{
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => setPreviewOpen(false)}
                className="btn btn-text"
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemDetailPage;