import React, { useState, useEffect } from 'react';
import { normalizeTypeName } from '../../utils/typeNormalization';

interface Parameter {
  name: string;
  type: string;
  value: any;
  description?: string;
}

interface TestCase {
  id?: string;
  sample: boolean;
  testCaseName: string;
  parameters: Parameter[];
  expectedReturn: any;
  returnType: string;
  explanation?: string;
}

interface ProblemFunction {
  name: string;
  parameters: Array<{name: string, type: string, description?: string}>;
  returnType: string;
}

interface TestCaseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (testCase: TestCase) => void;
  testCase?: TestCase;
  problemId?: string;
  problemFunction?: ProblemFunction;
}

const TestCaseModal: React.FC<TestCaseModalProps> = ({
  open,
  onClose,
  onSave,
  testCase,
  problemId,
  problemFunction,
}) => {
  const initializeParameters = (): Parameter[] => {
    if (testCase?.parameters && testCase.parameters.length > 0) {
      return testCase.parameters.map(param => ({
        ...param,
        type: normalizeTypeName(param.type)
      }));
    }

    if (problemFunction?.parameters && problemFunction.parameters.length > 0) {
      return problemFunction.parameters.map(param => {
        const normalizedType = normalizeTypeName(param.type);
        return {
          name: param.name,
          type: normalizedType,
          value: getDefaultValue(normalizedType),
          description: param.description
        };
      });
    }

    // Fallback: create default parameters if none exist
    return [
      {
        name: 'param1',
        type: 'integer',
        value: 0,
        description: 'First parameter'
      }
    ];
  };

  const [formData, setFormData] = useState<TestCase>({
    id: testCase?.id,
    sample: testCase?.sample || false,
    testCaseName: testCase?.testCaseName || '',
    parameters: initializeParameters(),
    expectedReturn: testCase?.expectedReturn || getDefaultValue(problemFunction?.returnType || 'int'),
    returnType: testCase?.returnType || problemFunction?.returnType || 'int',
    explanation: testCase?.explanation || ''
  });

  const isEditing = !!testCase?.id;
  const [saving, setSaving] = useState(false);

  // Helper function to get default values based on base type
  // Note: Arrays are entered as JSON, so defaults are all scalars
  function getDefaultValue(type: string): any {
    const typeMap: { [key: string]: any } = {
      'integer': 0,
      'string': '',
      'boolean': false,
      'float': 0.0,
      'character': '',

      // Legacy support - map to base types
      'int': 0,
      'bool': false,
      'double': 0.0,
      'char': '',
      'long': 0,
    };

    return typeMap[type] !== undefined ? typeMap[type] : 0;
  }

  useEffect(() => {
    if (open) {
      setFormData({
        id: testCase?.id,
        sample: testCase?.sample || false,
        testCaseName: testCase?.testCaseName || '',
        parameters: initializeParameters(),
        expectedReturn: testCase?.expectedReturn || getDefaultValue(problemFunction?.returnType || 'int'),
        returnType: testCase?.returnType || problemFunction?.returnType || 'int',
        explanation: testCase?.explanation || ''
      });
    }
  }, [testCase, open, problemFunction]);

  const handleSave = async () => {
    if (!problemId) {
      alert('Error: Problem ID is required');
      return;
    }

    // Validate required fields
    if (!formData.testCaseName.trim()) {
      alert('Error: Test case name is required');
      return;
    }

    try {
      setSaving(true);

      // Convert parameters to JSON format for backend
      const inputParameters = formData.parameters.reduce((acc, param) => {
        acc[param.name] = param.value;
        return acc;
      }, {} as any);

      const testCaseData = {
        test_case_name: formData.testCaseName,
        input_parameters: inputParameters,
        expected_return: formData.expectedReturn,
        parameter_types: formData.parameters.map(p => ({ name: p.name, type: p.type })),
        is_sample: formData.sample,
        explanation: formData.explanation,
        converted_to_params: true
      };

      const url = isEditing
        ? `/api/admin/testcases/${testCase.id}`
        : `/api/admin/problems/${problemId}/testcases`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
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
        const savedTestCase: TestCase = {
          id: result.data.id,
          sample: result.data.is_sample || false,
          testCaseName: result.data.test_case_name || formData.testCaseName,
          parameters: formData.parameters,
          expectedReturn: formData.expectedReturn,
          returnType: formData.returnType,
          explanation: result.data.explanation || formData.explanation
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

  const handleParameterChange = (index: number, field: keyof Parameter, value: any) => {
    const newParameters = [...formData.parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setFormData(prev => ({ ...prev, parameters: newParameters }));
  };

  const renderReturnValueInput = () => {
    // Auto-detect if value is an array (simplified type system)
    const isArrayType = Array.isArray(formData.expectedReturn);

    if (isArrayType) {
      return (
        <div>
          <textarea
            value={Array.isArray(formData.expectedReturn) ? JSON.stringify(formData.expectedReturn) : formData.expectedReturn}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleInputChange('expectedReturn', parsed);
              } catch {
                handleInputChange('expectedReturn', e.target.value);
              }
            }}
            placeholder={getPlaceholderForType(formData.returnType)}
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              boxSizing: 'border-box',
              backgroundColor: '#fefefe'
            }}
          />
          {/* Type detection indicator */}
          <div style={{ fontSize: '0.55rem', color: '#059669', marginTop: '6px', fontFamily: 'monospace' }}>
            ✓ Detected: {getStructureDescription(formData.expectedReturn, formData.returnType)}
          </div>
        </div>
      );
    }

    if (formData.returnType === 'bool' || formData.returnType === 'boolean') {
      return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={formData.expectedReturn.toString()}
            onChange={(e) => handleInputChange('expectedReturn', e.target.value === 'true')}
            style={{
              flex: 1,
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <span style={{
            padding: '8px 12px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#0c4a6e',
            fontFamily: 'monospace'
          }}>
            boolean
          </span>
        </div>
      );
    }

    return (
      <input
        type={getInputTypeForParamType(formData.returnType)}
        value={formData.expectedReturn}
        onChange={(e) => {
          const newValue = convertValueForType(e.target.value, formData.returnType);
          handleInputChange('expectedReturn', newValue);
        }}
        placeholder={getPlaceholderForType(formData.returnType)}
        style={{
          width: '100%',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          boxSizing: 'border-box',
          backgroundColor: 'white'
        }}
      />
    );
  };

  const renderParameterInput = (param: Parameter, index: number) => {
    // Check if value matches expected type dimensions
    const normalizedType = normalizeTypeName(param.type);
    const isArrayType = Array.isArray(param.value);
    const expectedDimensions = (normalizedType.match(/\[\]/g) || []).length;
    const actualDimensions = getArrayDimensions(param.value);
    const typeMismatch = expectedDimensions !== actualDimensions;

    return (
      <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        {/* Read-only parameter header showing name and type from problem definition */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{
            flex: 1,
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#1f2937',
            fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
          }}>
            {param.name}:
          </div>
          <div style={{
            padding: '4px 10px',
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#1e40af',
            fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
          }}>
            {normalizedType}
          </div>
        </div>

        {param.description && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontStyle: 'italic' }}>
            {param.description}
          </div>
        )}

        <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
          Value:
        </div>

        {/* Value Input */}
        {isArrayType || expectedDimensions > 0 ? (
          <div>
            <textarea
              value={Array.isArray(param.value) ? JSON.stringify(param.value) : param.value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleParameterChange(index, 'value', parsed);
                } catch {
                  handleParameterChange(index, 'value', e.target.value);
                }
              }}
              placeholder={getPlaceholderForType(normalizedType)}
              style={{
                width: '100%',
                border: typeMismatch ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 12px',
                fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
            />
            {/* Type validation indicator */}
            {typeMismatch ? (
              <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: '600' }}>
                ⚠️ Type mismatch: Expected {normalizedType}, got {getActualTypeString(param.value, normalizedType)}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                ✓ Valid {normalizedType}
              </div>
            )}
          </div>
        ) : normalizedType === 'boolean' ? (
          <select
            value={param.value.toString()}
            onChange={(e) => handleParameterChange(index, 'value', e.target.value === 'true')}
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type={getInputTypeForParamType(normalizedType)}
            value={param.value}
            onChange={(e) => {
              const newValue = convertValueForType(e.target.value, normalizedType);
              handleParameterChange(index, 'value', newValue);
            }}
            placeholder={getPlaceholderForType(normalizedType)}
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: 'white',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
            }}
          />
        )}
      </div>
    );
  };

  // Helper function to get array dimensions
  const getArrayDimensions = (value: any): number => {
    if (!Array.isArray(value)) return 0;
    if (value.length === 0) return 1;
    return 1 + getArrayDimensions(value[0]);
  };

  // Helper function to get actual type string from value
  const getActualTypeString = (value: any, expectedType: string): string => {
    const normalizedExpected = normalizeTypeName(expectedType);
    const baseType = normalizedExpected.replace(/\[\]/g, '');
    const dimensions = getArrayDimensions(value);
    return baseType + '[]'.repeat(dimensions);
  };

  // Helper functions for type handling
  const getInputTypeForParamType = (type: string): string => {
    if (type.includes('int') || type.includes('long')) return 'number';
    if (type.includes('double') || type.includes('float')) return 'number';
    if (type === 'char') return 'text';
    return 'text';
  };

  const convertValueForType = (value: string, type: string): any => {
    if (type.includes('int') || type.includes('long')) {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (type.includes('double') || type.includes('float')) {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0.0 : parsed;
    }
    return value;
  };

  const getPlaceholderForType = (type: string): string => {
    if (type.includes('int') && (type.includes('[]') || type.includes('vector') || type.includes('array') || type.includes('list'))) {
      return '[1, 2, 3]';
    }
    if (type.includes('string') && (type.includes('[]') || type.includes('vector') || type.includes('array') || type.includes('list'))) {
      return '["hello", "world"]';
    }
    if (type.includes('vector<vector') || type.includes('int[][]')) {
      return '[[1, 2], [3, 4]]';
    }
    if (type.includes('int') || type.includes('long')) {
      return '42';
    }
    if (type.includes('double') || type.includes('float')) {
      return '3.14';
    }
    if (type === 'char') {
      return 'a';
    }
    if (type === 'string') {
      return 'hello';
    }
    return `Enter ${type} value`;
  };

  const handleInputChange = (field: keyof TestCase, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to detect and describe array structure
  const getStructureDescription = (value: any, baseType: string): string => {
    if (!Array.isArray(value)) {
      return baseType.charAt(0).toUpperCase() + baseType.slice(1);
    }

    // Get dimensions
    const getDimensions = (val: any): number => {
      if (!Array.isArray(val)) return 0;
      if (val.length === 0) return 1;
      return 1 + getDimensions(val[0]);
    };

    const dims = getDimensions(value);

    if (dims === 1) {
      const length = value.length;
      return `1D array of ${length} ${baseType}${length !== 1 ? 's' : ''}`;
    }

    if (dims === 2) {
      const rows = value.length;
      const cols = (value.length > 0 && Array.isArray(value[0])) ? value[0].length : 0;
      return `${rows}×${cols} matrix of ${baseType}s`;
    }

    return `${dims}D array of ${baseType}s`;
  };

  if (!open) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "'Press Start 2P', cursive",
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          maxHeight: '90vh',
          width: '90%',
          maxWidth: '900px',
          border: '4px solid #212529',
          boxShadow: '12px 12px 0px #212529',
          overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: '#2D58A6',
            padding: '20px 24px',
            borderBottom: '4px solid #212529',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h1 style={{
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: 'white',
              textShadow: '2px 2px 0px #212529',
              margin: 0,
            }}>
              {isEditing ? 'Edit Test Case' : 'Add Test Case'}
            </h1>
            <button
              onClick={onClose}
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
            >
              ✕ Close
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Basic Information */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#212529',
                fontSize: '0.65rem',
              }}>
                Test Case Name
              </label>
              <input
                type="text"
                value={formData.testCaseName}
                onChange={(e) => handleInputChange('testCaseName', e.target.value)}
                placeholder="e.g., Example 1"
                style={{
                  width: '100%',
                  border: '4px solid #212529',
                  padding: '12px',
                  fontSize: '0.7rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  boxShadow: '4px 4px 0px #212529',
                  fontFamily: "'Press Start 2P', cursive",
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', border: '3px solid #212529', backgroundColor: '#f9fafb' }}>
                <input
                  type="checkbox"
                  checked={formData.sample}
                  onChange={(e) => handleInputChange('sample', e.target.checked)}
                  style={{
                    marginRight: '12px',
                    marginTop: '2px',
                    accentColor: '#2D58A6',
                    width: '18px',
                    height: '18px',
                  }}
                />
                <div>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#212529',
                    fontSize: '0.6rem',
                  }}>
                    Sample Test Case
                  </span>
                  <div style={{
                    fontSize: '0.55rem',
                    color: '#6b7280',
                    marginTop: '6px',
                    lineHeight: '1.5',
                  }}>
                    Visible to participants during the contest
                  </div>
                </div>
              </label>
            </div>

          {/* Function Information */}
          {problemFunction && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#374151'
              }}>
                Function: {problemFunction.name}()
              </h3>
              <div style={{
                fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                fontSize: '14px',
                color: '#1f2937',
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                {problemFunction.name}({problemFunction.parameters.map(p => `${p.type} ${p.name}`).join(', ')}) → {problemFunction.returnType}
              </div>
            </div>
          )}

          {/* Function Parameters */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#374151'
            }}>
              Input Parameters
            </h3>

            {formData.parameters && formData.parameters.length > 0 ? (
              formData.parameters.map((param, index) => (
                <div key={`${param.name}-${index}`} style={{
                  marginBottom: '20px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <label style={{
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Parameter {index + 1}
                      {param.description && (
                        <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.8rem' }}>
                          {' '}- {param.description}
                        </span>
                      )}
                    </label>
                  </div>
                  {renderParameterInput(param, index)}
                </div>
              ))
            ) : (
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No parameters defined. Please define function parameters in the problem settings first.
                </p>
              </div>
            )}

            {/* Add Parameter Button */}
            <button
              type="button"
              onClick={() => {
                const newParam: Parameter = {
                  name: `param${formData.parameters.length + 1}`,
                  type: 'int',
                  value: getDefaultValue('int'),
                  description: ''
                };
                setFormData(prev => ({
                  ...prev,
                  parameters: [...prev.parameters, newParam]
                }));
              }}
              style={{
                marginTop: '16px',
                padding: '12px 20px',
                backgroundColor: '#2D58A6',
                color: 'white',
                border: '3px solid #212529',
                boxShadow: '4px 4px 0px #212529',
                textShadow: '1px 1px 0px #212529',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3B6BBD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2D58A6';
              }}
            >
              + Add Parameter
            </button>
          </div>

          {/* Expected Return Value */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '3px solid #212529',
            boxShadow: '4px 4px 0px #212529'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontWeight: 'bold',
                color: '#212529',
                fontSize: '0.65rem',
                marginBottom: '8px'
              }}>
                Expected Return Value
              </label>
              <select
                value={formData.returnType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    returnType: newType,
                    expectedReturn: getDefaultValue(newType)
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '3px solid #212529',
                  fontSize: '0.6rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '3px 3px 0px #212529',
                  fontFamily: "'Press Start 2P', cursive",
                  cursor: 'pointer'
                }}
              >
                <option value="integer">Integer</option>
                <option value="string">String</option>
                <option value="boolean">Boolean</option>
                <option value="float">Float</option>
                <option value="character">Character</option>
              </select>
            </div>

            {renderReturnValueInput()}
          </div>

          {/* Explanation */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '3px solid #212529',
            boxShadow: '4px 4px 0px #212529'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#212529',
              fontSize: '0.65rem',
            }}>
              Explanation (Optional)
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              placeholder="Explain why this test case returns this result..."
              style={{
                width: '100%',
                border: '3px solid #212529',
                fontSize: '0.6rem',
                padding: '12px',
                minHeight: '80px',
                resize: 'vertical',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                boxShadow: '3px 3px 0px #212529',
                fontFamily: "'Press Start 2P', cursive",
              }}
            />
          </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                background: saving ? '#6b7280' : '#2D58A6',
                color: 'white',
                border: '4px solid #212529',
                padding: '16px 24px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: "'Press Start 2P', cursive",
                boxShadow: '6px 6px 0px #212529',
                textShadow: '2px 2px 0px #212529',
                marginTop: '20px',
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = '#3B6BBD';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = '#2D58A6';
                }
              }}
            >
              {saving ? `${isEditing ? 'Updating' : 'Creating'}...` : `${isEditing ? 'Update' : 'Create'} Test Case`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestCaseModal;
