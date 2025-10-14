/**
 * Problem Detail Page
 * Matches the design from screenshot 3 - Problem management with Details and Test Cases tabs
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import TestCaseModal from '../components/Admin/TestCaseModal';
import RichTextEditor from '../components/common/RichTextEditor';
import apiService from '../services/api';
import '../styles/theme.css';
import { normalizeTypeName, inferTypeFromValue } from '../utils/typeNormalization';

interface TestCase {
  id: string;
  order: number;
  input_parameters: any;
  expected_return: any;
  test_case_name: string;
  explanation?: string;
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
  // Function configuration (LeetCode-style)
  functionName?: string;
  parameters?: Array<{name: string, type: string, description?: string}>;
  returnType?: string;
}

// Conversion functions between different TestCase interfaces
const convertToModalTestCase = (testCase: any): any => {
  if (!testCase) return null;

  // Helper function to infer type from value
  // Parse parameter_types if it exists and is a string
  let paramTypes: any = {};
  if (testCase.parameter_types) {
    const types = typeof testCase.parameter_types === 'string'
      ? JSON.parse(testCase.parameter_types)
      : testCase.parameter_types;

    // Convert array of {name, type} to a map for easy lookup
    if (Array.isArray(types)) {
      types.forEach((pt: any) => {
        paramTypes[pt.name] = normalizeTypeName(pt.type);
      });
    }
  }

  // Convert input_parameters object to parameters array with proper types
  let parameters: any[] = [];
  if (testCase.input_parameters && typeof testCase.input_parameters === 'object') {
    parameters = Object.entries(testCase.input_parameters).map(([name, value]) => {
      const storedType = paramTypes[name];
      const inferredType = normalizeTypeName(inferTypeFromValue(value));

      // Use inferred type if stored type is missing or doesn't match the actual value structure
      let finalType = storedType || inferredType;

      if (storedType) {
        const storedDimensions = (storedType.match(/\[\]/g) || []).length;
        const inferredDimensions = (inferredType.match(/\[\]/g) || []).length;
        const storedBase = storedType.replace(/\[\]/g, '');
        const inferredBase = inferredType.replace(/\[\]/g, '');

        if (storedDimensions !== inferredDimensions || storedBase !== inferredBase) {
          finalType = inferredType;
        }
      }

      return {
        name,
        value,
        type: normalizeTypeName(finalType)
      };
    });
  }

  // Determine return type
  let returnType = 'string';
  if (typeof testCase.expected_return === 'number') {
    returnType = Number.isInteger(testCase.expected_return) ? 'int' : 'float';
  } else if (typeof testCase.expected_return === 'boolean') {
    returnType = 'boolean';
  } else if (Array.isArray(testCase.expected_return)) {
    returnType = normalizeTypeName(inferTypeFromValue(testCase.expected_return));
  }

  return {
    id: testCase.id,
    sample: testCase.sample,
    testCaseName: testCase.test_case_name || `Test Case ${testCase.order}`,
    parameters,
    expectedReturn: testCase.expected_return,
    returnType,
    explanation: testCase.explanation || ''
  };
};

const convertFromModalTestCase = (modalTestCase: any): TestCase => {
  const inputParams: any = {};
  if (modalTestCase.parameters) {
    modalTestCase.parameters.forEach((param: any) => {
      inputParams[param.name] = param.value;
    });
  }

  return {
    id: modalTestCase.id,
    order: 1, // Will be set properly by calling function
    input_parameters: inputParams,
    expected_return: modalTestCase.expectedReturn,
    test_case_name: modalTestCase.testCaseName,
    explanation: modalTestCase.explanation,
    sample: modalTestCase.sample || false
  };
};

const ProblemDetailPage: React.FC = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testCaseModalOpen, setTestCaseModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<any>(null);
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

  // Type options for parameters (bracket notation)
  const typeOptions = [
    { value: 'INT', display: 'INT', description: 'Single integer' },
    { value: 'INT[]', display: 'INT[]', description: '1D array of integers' },
    { value: 'INT[][]', display: 'INT[][]', description: '2D array (matrix) of integers' },
    { value: 'STRING', display: 'STRING', description: 'Single string' },
    { value: 'STRING[]', display: 'STRING[]', description: '1D array of strings' },
    { value: 'STRING[][]', display: 'STRING[][]', description: '2D array of strings' },
    { value: 'FLOAT', display: 'FLOAT', description: 'Single float' },
    { value: 'FLOAT[]', display: 'FLOAT[]', description: '1D array of floats' },
    { value: 'FLOAT[][]', display: 'FLOAT[][]', description: '2D array of floats' },
    { value: 'BOOL', display: 'BOOL', description: 'Single boolean' },
    { value: 'BOOL[]', display: 'BOOL[]', description: '1D array of booleans' },
    { value: 'CHAR', display: 'CHAR', description: 'Single character' },
    { value: 'CHAR[]', display: 'CHAR[]', description: '1D array of characters' }
  ];

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
        const problemResult = await apiService.getAdminProblem(parseInt(problemId));

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
            // Function configuration
            functionName: problemData.function_name,
            parameters: problemData.function_parameters
              ? (typeof problemData.function_parameters === 'string'
                  ? JSON.parse(problemData.function_parameters)
                  : problemData.function_parameters)
              : [],
            returnType: problemData.return_type,
          });
        } else {
          throw new Error('Failed to fetch problem details');
        }

        // Fetch test cases
        const testCasesResult = await apiService.getProblemTestCases(parseInt(problemId));

        if (testCasesResult.success && testCasesResult.data) {
          const transformedTestCases = testCasesResult.data.map((tc: any, index: number) => ({
            id: tc.id,
            order: index + 1,
            input_parameters: tc.input_parameters,
            expected_return: tc.expected_return,
            parameter_types: tc.parameter_types, // Include parameter types for proper conversion
            test_case_name: tc.test_case_name || `Test Case ${index + 1}`,
            explanation: tc.explanation,
            tag: '', // Backend doesn't store tags, so use empty string
            sample: tc.is_sample || false,
            additional: false, // Backend doesn't store this field
            strength: 10, // Backend doesn't store strength, so use default
          }));
          setTestCases(transformedTestCases);
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
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editedProblem.title,
          description: editedProblem.description,
          input_format: editedProblem.inputFormat,
          output_format: editedProblem.outputFormat,
          constraints: editedProblem.constraints,
          difficulty: editedProblem.difficulty,
          // Function configuration
          function_name: editedProblem.functionName,
          function_parameters: JSON.stringify(editedProblem.parameters || []),
          return_type: editedProblem.returnType,
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

  // Parameter management handlers
  const handleParameterChange = (index: number, field: 'name' | 'type' | 'description', value: string) => {
    if (editedProblem && editedProblem.parameters) {
      const newParams = [...editedProblem.parameters];
      newParams[index] = { ...newParams[index], [field]: value };
      setEditedProblem({ ...editedProblem, parameters: newParams });
    }
  };

  const addParameter = () => {
    if (editedProblem) {
      const newParams = editedProblem.parameters || [];
      setEditedProblem({
        ...editedProblem,
        parameters: [...newParams, { name: 'param', type: 'INT', description: '' }]
      });
    }
  };

  const removeParameter = (index: number) => {
    if (editedProblem && editedProblem.parameters) {
      setEditedProblem({
        ...editedProblem,
        parameters: editedProblem.parameters.filter((_, i) => i !== index)
      });
    }
  };

  const handlePreviewProblem = () => {
    setPreviewOpen(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleAddTestCase = (testCase: any) => {
    const newTestCase: TestCase = convertFromModalTestCase(testCase);
    newTestCase.order = testCases.length + 1;

    setTestCases(prev => [...prev, newTestCase]);
  };

  const handleEditTestCase = (testCase: TestCase) => {
    setEditingTestCase(convertToModalTestCase(testCase));
    setTestCaseModalOpen(true);
  };

  const handleUpdateTestCase = (updatedTestCase: any) => {
    const updatedTC: TestCase = convertFromModalTestCase(updatedTestCase);

    // Find the original test case to preserve the order
    const originalTC = testCases.find(tc => tc.id === updatedTC.id);
    updatedTC.order = originalTC?.order || 1;

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
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
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
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
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
            minHeight: '100vh',
            backgroundColor: '#CECDE2',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid transparent',
              borderTop: '4px solid #212529',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </>
    );
  }

  if (error) {
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
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                color: '#dc2626',
                fontSize: '0.7rem',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              Error: {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                position: 'relative',
                border: '4px solid #212529',
                backgroundColor: '#2D58A6',
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                fontSize: '1rem',
                padding: '16px 24px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

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
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px',
              letterSpacing: '0.05em',
              textShadow: '4px 4px 0px #212529',
            }}>
              Problem Management
            </h1>

            <h2 style={{
              fontSize: 'clamp(0.6rem, 2vw, 0.8rem)',
              color: '#FFD700',
              marginBottom: '24px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0px #212529',
            }}>
              {problem?.title || 'Loading Problem...'}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/admin/problems')}
                style={{
                  border: '4px solid #212529',
                  backgroundColor: '#ffffff',
                  color: '#212529',
                  boxShadow: '4px 4px 0px #212529',
                  fontSize: '0.65rem',
                  padding: '10px 16px',
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
                ← Back
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '0',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setSelectedTab(0)}
              style={{
                border: '4px solid #212529',
                backgroundColor: selectedTab === 0 ? '#2D58A6' : '#ffffff',
                color: selectedTab === 0 ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: selectedTab === 0 ? '2px 2px 0px #212529' : 'none',
                fontSize: '0.65rem',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                flex: 1,
                minWidth: '120px',
              }}
            >
              Details
            </button>
            <button
              onClick={() => setSelectedTab(1)}
              style={{
                border: '4px solid #212529',
                backgroundColor: selectedTab === 1 ? '#2D58A6' : '#ffffff',
                color: selectedTab === 1 ? 'white' : '#212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: selectedTab === 1 ? '2px 2px 0px #212529' : 'none',
                fontSize: '0.65rem',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                flex: 1,
                minWidth: '120px',
              }}
            >
              Test Cases ({testCases.length})
            </button>
          </div>

          {/* Tab Content */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              borderTop: 'none',
              boxShadow: '8px 8px 0px #212529',
              padding: '24px',
              minHeight: '400px',
            }}
          >
            {selectedTab === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '3px solid #212529' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0, color: '#212529' }}>
                  Problem Details
                </h3>
                {!editMode && (
                  <button
                    onClick={handleEdit}
                    style={{
                      background: '#2D58A6',
                      color: 'white',
                      border: '4px solid #212529',
                      boxShadow: '4px 4px 0px #212529',
                      textShadow: '2px 2px 0px #212529',
                      padding: '10px 16px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: "'Press Start 2P', cursive",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B6BBD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2D58A6';
                    }}
                  >
                    Edit Problem
                  </button>
                )}
              </div>

              {/* Success/Error Messages */}
              {saveSuccess && (
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#f0fdf4',
                    border: '4px solid #22c55e',
                    color: '#15803d',
                    fontSize: '0.7rem',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                  }}
                >
                  ✓ Problem updated successfully!
                </div>
              )}

              {saveError && (
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#fef2f2',
                    border: '4px solid #dc2626',
                    color: '#dc2626',
                    fontSize: '0.7rem',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                  }}
                >
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
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      color: '#212529',
                    }}>
                      Problem Title
                    </label>
                    <input
                      type="text"
                      value={editedProblem.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '4px solid #212529',
                        background: '#ffffff',
                        color: '#212529',
                        fontSize: '0.7rem',
                        fontFamily: "'Press Start 2P', cursive",
                        boxShadow: '4px 4px 0px #212529',
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
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      color: '#212529',
                    }}>
                      Difficulty Level
                    </label>
                    <select
                      value={editedProblem.difficulty}
                      onChange={(e) => handleFieldChange('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '4px solid #212529',
                        background: '#ffffff',
                        color: '#212529',
                        fontSize: '0.7rem',
                        fontFamily: "'Press Start 2P', cursive",
                        boxShadow: '4px 4px 0px #212529',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Function Configuration (LeetCode-Style) */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f0f9ff',
                    border: '3px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                  }}>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: '#212529',
                      fontFamily: "'Press Start 2P', cursive"
                    }}>
                      Function Configuration
                    </h4>

                    {/* Function Name */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        color: '#212529',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive"
                      }}>
                        Function Name
                      </label>
                      <input
                        type="text"
                        value={editedProblem.functionName || ''}
                        onChange={(e) => setEditedProblem({...editedProblem, functionName: e.target.value})}
                        placeholder="solution"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #212529',
                          fontSize: '0.75rem',
                          fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Return Type */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        color: '#212529',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive"
                      }}>
                        Return Type
                      </label>
                      <select
                        value={editedProblem.returnType || 'INT'}
                        onChange={(e) => setEditedProblem({...editedProblem, returnType: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #212529',
                          fontSize: '0.75rem',
                          fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                          boxSizing: 'border-box'
                        }}
                      >
                        {typeOptions.map(type => (
                          <option key={type.value} value={type.value} title={type.description}>
                            {type.display}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Parameters */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        color: '#212529',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive"
                      }}>
                        Parameters
                      </label>

                      {(editedProblem.parameters || []).map((param, index) => (
                        <div key={index} style={{
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: '#ffffff',
                          border: '2px solid #d1d5db',
                          borderRadius: '4px'
                        }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.55rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                Name
                              </label>
                              <input
                                type="text"
                                value={param.name}
                                onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                                placeholder="paramName"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '0.7rem',
                                  fontFamily: '"Fira Code", monospace',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.55rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                Type
                              </label>
                              <select
                                value={param.type}
                                onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '0.7rem',
                                  fontFamily: '"Fira Code", monospace',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {typeOptions.map(type => (
                                  <option key={type.value} value={type.value} title={type.description}>
                                    {type.display}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.55rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                &nbsp;
                              </label>
                              <button
                                onClick={() => removeParameter(index)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fee2e2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.55rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={param.description || ''}
                              onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                              placeholder="Parameter description"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                fontSize: '0.7rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addParameter}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#2D58A6',
                          color: 'white',
                          border: '2px solid #212529',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          fontFamily: "'Press Start 2P', cursive"
                        }}
                      >
                        + Add Parameter
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saveLoading}
                      style={{
                        border: '4px solid #212529',
                        backgroundColor: '#ffffff',
                        color: '#212529',
                        boxShadow: '4px 4px 0px #212529',
                        fontSize: '0.65rem',
                        padding: '10px 16px',
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                        opacity: saveLoading ? 0.5 : 1,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProblem}
                      disabled={saveLoading}
                      style={{
                        background: saveLoading ? '#6b7280' : '#2D58A6',
                        color: 'white',
                        border: '4px solid #212529',
                        boxShadow: '4px 4px 0px #212529',
                        textShadow: '2px 2px 0px #212529',
                        padding: '10px 16px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                      }}
                    >
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
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Title
                        </h4>
                        <p style={{
                          color: '#212529',
                          fontSize: '0.65rem',
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          {problem.title}
                        </p>
                      </div>

                      <div>
                        <h4 style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Description
                        </h4>
                        <div style={{
                          color: '#212529',
                          fontSize: '0.65rem',
                          lineHeight: 1.6,
                          padding: '16px',
                          border: '3px solid #212529',
                          backgroundColor: '#f9fafb',
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
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Input Format
                        </h4>
                        <div style={{
                          color: '#212529',
                          fontSize: '0.65rem',
                          lineHeight: 1.6,
                          padding: '16px',
                          border: '3px solid #212529',
                          backgroundColor: '#f9fafb',
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
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Output Format
                        </h4>
                        <div style={{
                          color: '#212529',
                          fontSize: '0.65rem',
                          lineHeight: 1.6,
                          padding: '16px',
                          border: '3px solid #212529',
                          backgroundColor: '#f9fafb',
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
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Constraints
                        </h4>
                        <div style={{
                          color: '#212529',
                          fontSize: '0.65rem',
                          lineHeight: 1.6,
                          padding: '16px',
                          border: '3px solid #212529',
                          backgroundColor: '#f9fafb',
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
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: '#212529',
                          marginBottom: '12px',
                        }}>
                          Difficulty Level
                        </h4>
                        <div>
                          <span
                            style={{
                              backgroundColor: problem.difficulty === 'easy' ? '#22c55e40' :
                                            problem.difficulty === 'medium' ? '#ffc10740' : '#dc262640',
                              color: problem.difficulty === 'easy' ? '#15803d' :
                                     problem.difficulty === 'medium' ? '#b45309' : '#dc2626',
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              padding: '4px 8px',
                              border: problem.difficulty === 'easy' ? '2px solid #22c55e' :
                                      problem.difficulty === 'medium' ? '2px solid #ffc107' : '2px solid #dc2626',
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
            )}

            {selectedTab === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '3px solid #212529', paddingBottom: '12px' }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0, color: '#212529' }}>
                    Test Cases
                  </h3>
                  <button
                    onClick={() => setTestCaseModalOpen(true)}
                    style={{
                      background: '#2D58A6',
                      color: 'white',
                      border: '4px solid #212529',
                      boxShadow: '4px 4px 0px #212529',
                      textShadow: '2px 2px 0px #212529',
                      padding: '10px 16px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: "'Press Start 2P', cursive",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B6BBD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2D58A6';
                    }}
                  >
                    + Add Test Case
                  </button>
                </div>

                {testCases.length === 0 && (
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#fef3c7',
                      border: '4px solid #fbbf24',
                      color: '#92400e',
                      fontSize: '0.7rem',
                      lineHeight: '1.6',
                      marginBottom: '16px',
                    }}
                  >
                    Warning: You do not have any test cases for this problem. Add at least one test case.
                  </div>
                )}


                {/* Test Cases List */}
                {testCases.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {testCases.map((testCase, index) => (
                      <div key={testCase.id} style={{ padding: '16px', border: '4px solid #212529', background: '#ffffff', boxShadow: '4px 4px 0px #212529' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h4 style={{ fontWeight: 'bold', fontSize: '0.75rem', margin: 0, color: '#212529' }}>
                            Test Case {testCase.order}
                          </h4>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {testCase.sample && (
                              <span
                                style={{
                                  backgroundColor: '#22c55e40',
                                  color: '#15803d',
                                  fontSize: '0.6rem',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  padding: '4px 8px',
                                  border: '2px solid #22c55e',
                                }}
                              >
                                ✓ Sample
                              </span>
                            )}
                            <button
                              onClick={() => handleEditTestCase(testCase)}
                              style={{
                                background: '#2D58A6',
                                color: 'white',
                                border: '3px solid #212529',
                                boxShadow: '3px 3px 0px #212529',
                                textShadow: '1px 1px 0px #212529',
                                padding: '6px 12px',
                                fontSize: '0.55rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', cursive",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#3B6BBD';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2D58A6';
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTestCase(testCase)}
                              style={{
                                background: '#dc2626',
                                color: 'white',
                                border: '3px solid #212529',
                                boxShadow: '3px 3px 0px #212529',
                                textShadow: '1px 1px 0px #212529',
                                padding: '6px 12px',
                                fontSize: '0.55rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', cursive",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#b91c1c';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280', lineHeight: '1.8' }}>
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: '#212529' }}>Input:</strong>{' '}
                            <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', fontFamily: 'monospace' }}>
                              {(() => {
                                const inputStr = typeof testCase.input_parameters === 'string'
                                  ? testCase.input_parameters
                                  : JSON.stringify(testCase.input_parameters || '');
                                return inputStr && inputStr.length > 50 ? inputStr.substring(0, 50) + '...' : inputStr || '';
                              })()}
                            </code>
                          </div>
                          <div>
                            <strong style={{ color: '#212529' }}>Expected Output:</strong>{' '}
                            <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', fontFamily: 'monospace' }}>
                              {(() => {
                                const outputStr = typeof testCase.expected_return === 'string'
                                  ? testCase.expected_return
                                  : JSON.stringify(testCase.expected_return || '');
                                return outputStr && outputStr.length > 50 ? outputStr.substring(0, 50) + '...' : outputStr || '';
                              })()}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px', border: '3px dashed #212529' }}>
                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '24px' }}>
                      No test cases added yet
                    </p>
                    <button
                      onClick={() => setTestCaseModalOpen(true)}
                      style={{
                        background: '#2D58A6',
                        color: 'white',
                        border: '4px solid #212529',
                        boxShadow: '6px 6px 0px #212529',
                        textShadow: '2px 2px 0px #212529',
                        padding: '12px 24px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', cursive",
                      }}
                    >
                      + Add First Test Case
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePreviewProblem}
              style={{
                border: '4px solid #212529',
                backgroundColor: '#ffffff',
                color: '#212529',
                boxShadow: '4px 4px 0px #212529',
                fontSize: '0.65rem',
                padding: '10px 16px',
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
              Preview Problem
            </button>
            <button
              onClick={handleDeleteProblem}
              disabled={deletingProblem}
              style={{
                background: deletingProblem ? '#6b7280' : '#dc2626',
                color: 'white',
                border: '4px solid #212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                padding: '10px 16px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                cursor: deletingProblem ? 'not-allowed' : 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                opacity: deletingProblem ? 0.7 : 1,
              }}
            >
              {deletingProblem ? 'Deleting...' : 'Delete Problem'}
            </button>
          </div>
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

      {/* Delete Test Case Confirmation Dialog */}
      {deleteDialogOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', cursive"
          }}
          onClick={handleCancelDelete}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '12px 12px 0px #212529',
              width: '90%',
              maxWidth: '600px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '4px solid #212529',
              backgroundColor: '#dc2626'
            }}>
              <h2 style={{
                margin: 0,
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: 'white',
                textShadow: '2px 2px 0px #212529'
              }}>
                Delete Test Case
              </h2>
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  color: 'white',
                  lineHeight: 1,
                  opacity: deleting ? 0.5 : 1
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '0.7rem',
                color: '#212529',
                marginBottom: '20px',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                Are you sure you want to delete this test case?
              </p>

              {testCaseToDelete && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '4px solid #212529',
                  padding: '16px',
                  marginBottom: '20px',
                  boxShadow: '4px 4px 0px #212529'
                }}>
                  <div style={{ fontSize: '0.6rem', color: '#212529', lineHeight: '1.8', fontFamily: 'monospace' }}>
                    <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
                      <strong>Input:</strong> {
                        testCaseToDelete.input_parameters
                          ? (typeof testCaseToDelete.input_parameters === 'string'
                              ? testCaseToDelete.input_parameters
                              : JSON.stringify(testCaseToDelete.input_parameters))
                          : '(empty)'
                      }
                    </p>
                    <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
                      <strong>Expected:</strong> {
                        testCaseToDelete.expected_return
                          ? (typeof testCaseToDelete.expected_return === 'string'
                              ? testCaseToDelete.expected_return
                              : JSON.stringify(testCaseToDelete.expected_return))
                          : '(empty)'
                      }
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Sample:</strong> {testCaseToDelete.sample ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              )}

              <div style={{
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                padding: '12px',
                marginBottom: '20px',
                boxShadow: '4px 4px 0px #dc2626',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.6rem',
                  color: '#dc2626',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  ⚠ This action cannot be undone
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#212529',
                    border: '4px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                    padding: '10px 20px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.65rem',
                    fontFamily: "'Press Start 2P', cursive",
                    opacity: deleting ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{
                    background: deleting ? '#6b7280' : '#dc2626',
                    color: 'white',
                    border: '4px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                    textShadow: '2px 2px 0px #212529',
                    padding: '10px 20px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: "'Press Start 2P', cursive",
                    opacity: deleting ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
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
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', cursive"
          }}
          onClick={handleCancelDeleteProblem}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '12px 12px 0px #212529',
              width: '90%',
              maxWidth: '700px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '4px solid #212529',
              backgroundColor: '#dc2626'
            }}>
              <h2 style={{
                margin: 0,
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: 'white',
                textShadow: '2px 2px 0px #212529'
              }}>
                Delete Problem
              </h2>
              <button
                onClick={handleCancelDeleteProblem}
                disabled={deletingProblem}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: deletingProblem ? 'not-allowed' : 'pointer',
                  color: 'white',
                  lineHeight: 1,
                  opacity: deletingProblem ? 0.5 : 1
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '0.7rem',
                color: '#212529',
                marginBottom: '20px',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                Are you sure you want to delete this problem?
              </p>

              {problem && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '4px solid #212529',
                  padding: '16px',
                  marginBottom: '20px',
                  boxShadow: '4px 4px 0px #212529'
                }}>
                  <h4 style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: '#212529',
                    marginBottom: '12px',
                    wordBreak: 'break-word'
                  }}>
                    {problem.title}
                  </h4>
                  <div style={{ fontSize: '0.6rem', color: '#6b7280', lineHeight: '1.8' }}>
                    <p style={{ margin: '4px 0' }}>Problem ID: {problem.id || 'N/A'}</p>
                    <p style={{ margin: '4px 0' }}>Difficulty: {problem.difficulty || 'N/A'}</p>
                    <p style={{ margin: '4px 0' }}>Test Cases: {testCases.length}</p>
                  </div>
                </div>
              )}

              <div style={{
                backgroundColor: '#fef2f2',
                border: '4px solid #dc2626',
                padding: '16px',
                marginBottom: '20px',
                boxShadow: '4px 4px 0px #dc2626'
              }}>
                <p style={{
                  fontSize: '0.65rem',
                  color: '#dc2626',
                  fontWeight: 'bold',
                  marginBottom: '12px'
                }}>
                  ⚠ Warning: This action is permanent!
                </p>
                <div style={{
                  fontSize: '0.6rem',
                  color: '#dc2626',
                  lineHeight: '1.8'
                }}>
                  <p style={{ margin: '4px 0' }}>• The problem and all its details</p>
                  <p style={{ margin: '4px 0' }}>• All {testCases.length} test cases</p>
                  <p style={{ margin: '4px 0' }}>• All submissions for this problem</p>
                  <p style={{ margin: '4px 0' }}>• This action CANNOT be undone</p>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleCancelDeleteProblem}
                  disabled={deletingProblem}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#212529',
                    border: '4px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                    padding: '10px 20px',
                    cursor: deletingProblem ? 'not-allowed' : 'pointer',
                    fontSize: '0.65rem',
                    fontFamily: "'Press Start 2P', cursive",
                    opacity: deletingProblem ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!deletingProblem) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deletingProblem) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteProblem}
                  disabled={deletingProblem}
                  style={{
                    background: deletingProblem ? '#6b7280' : '#dc2626',
                    color: 'white',
                    border: '4px solid #212529',
                    boxShadow: '4px 4px 0px #212529',
                    textShadow: '2px 2px 0px #212529',
                    padding: '10px 20px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    cursor: deletingProblem ? 'not-allowed' : 'pointer',
                    fontFamily: "'Press Start 2P', cursive",
                    opacity: deletingProblem ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!deletingProblem) {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deletingProblem) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }
                  }}
                >
                  {deletingProblem ? 'Deleting...' : 'Delete Problem'}
                </button>
              </div>
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
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
            fontFamily: "'Press Start 2P', cursive",
          }}
          onClick={() => setPreviewOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '12px 12px 0px #212529',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#2D58A6',
                padding: '16px 24px',
                borderBottom: '4px solid #212529',
              }}
            >
              <h3 style={{
                color: 'white',
                fontWeight: 'bold',
                margin: 0,
                fontSize: '0.9rem',
                textShadow: '2px 2px 0px #212529',
              }}>
                Problem Preview
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{
                  background: '#dc2626',
                  border: '3px solid #212529',
                  boxShadow: '3px 3px 0px #212529',
                  color: 'white',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontFamily: "'Press Start 2P', cursive",
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                title="Close preview"
              >
                ✕ Close
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {problem && (
                <div>
                  {/* Problem Title */}
                  <h1 style={{
                    marginBottom: '24px',
                    color: '#212529',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    paddingBottom: '16px',
                    borderBottom: '3px solid #212529',
                  }}>
                    {problem.title}
                  </h1>

                  {/* Problem Description */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      marginBottom: '12px',
                      color: '#212529',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                    }}>
                      Description
                    </h3>
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '16px',
                      border: '3px solid #212529',
                      fontSize: '0.65rem',
                      lineHeight: '1.6',
                    }}>
                      <ReactMarkdown>{problem.description}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Input Format */}
                  {problem.inputFormat && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{
                        marginBottom: '12px',
                        color: '#212529',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                      }}>
                        Input Format
                      </h3>
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        border: '3px solid #212529',
                        fontSize: '0.65rem',
                        lineHeight: '1.6',
                      }}>
                        <ReactMarkdown>{problem.inputFormat}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Output Format */}
                  {problem.outputFormat && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{
                        marginBottom: '12px',
                        color: '#212529',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                      }}>
                        Output Format
                      </h3>
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        border: '3px solid #212529',
                        fontSize: '0.65rem',
                        lineHeight: '1.6',
                      }}>
                        <ReactMarkdown>{problem.outputFormat}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {problem.constraints && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{
                        marginBottom: '12px',
                        color: '#212529',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                      }}>
                        Constraints
                      </h3>
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        border: '3px solid #212529',
                        fontSize: '0.65rem',
                        lineHeight: '1.6',
                      }}>
                        <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
  );
};

export default ProblemDetailPage;
