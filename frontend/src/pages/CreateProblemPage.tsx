import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/common/RichTextEditor';
import apiService from '../services/api';

interface TypeOption {
  value: string;
  display: string;
}

interface ProblemFormData {
  problemName: string;
  description: string;
  problemStatement: string;
  inputFormat: string;
  constraints: string;
  outputFormat: string;
  points: number;
  timeLimit: number;
  memoryLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  // LeetCode-style fields
  functionName: string;
  parameters: Array<{name: string, type: string, description?: string}>;
  returnType: string;
  useLeetCodeStyle: boolean;
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
    timeLimit: 1000,
    memoryLimit: 256,
    difficulty: 'medium',
    // LeetCode-style (always enabled)
    functionName: 'solution',
    parameters: [{ name: 'nums', type: 'INT[]', description: 'Input array' }],
    returnType: 'INT[]',
    useLeetCodeStyle: true,
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof ProblemFormData) => (value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParameterChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newParams = [...prev.parameters];
      newParams[index] = { ...newParams[index], [field]: value };
      return { ...prev, parameters: newParams };
    });
  };

  const addParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { name: 'param', type: 'INT', description: '' }
      ]
    }));
  };

  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  // Helper function to parse bracket notation type
  const parseType = (typeStr: string): { baseType: string; dimensions: number } => {
    const bracketMatches = typeStr.match(/\[\]/g);
    const dimensions = bracketMatches ? bracketMatches.length : 0;
    const baseType = typeStr.replace(/\[\]/g, '').trim();
    return { baseType, dimensions };
  };

  // Helper function to convert bracket notation to language-specific type
  const getLanguageType = (typeStr: string, language: 'cpp' | 'java' | 'python'): string => {
    const { baseType, dimensions } = parseType(typeStr);

    const typeMap: Record<string, Record<string, string>> = {
      INT: { cpp: 'int', java: 'int', python: 'int' },
      STRING: { cpp: 'string', java: 'String', python: 'str' },
      FLOAT: { cpp: 'double', java: 'double', python: 'float' },
      BOOL: { cpp: 'bool', java: 'boolean', python: 'bool' },
      CHAR: { cpp: 'char', java: 'char', python: 'str' }
    };

    let langType = typeMap[baseType]?.[language] || 'int';

    // Add array dimensions
    if (dimensions === 0) {
      return langType;
    }

    if (language === 'cpp') {
      for (let i = 0; i < dimensions; i++) {
        langType = `vector<${langType}>`;
      }
    } else if (language === 'java') {
      langType += '[]'.repeat(dimensions);
    } else if (language === 'python') {
      for (let i = 0; i < dimensions; i++) {
        langType = `List[${langType}]`;
      }
    }

    return langType;
  };

  // Generate preview code for each language
  const generatePreview = (language: 'cpp' | 'java' | 'python'): string => {
    const returnType = getLanguageType(formData.returnType, language);
    const params = formData.parameters.map(p => {
      const langType = getLanguageType(p.type, language);
      const { dimensions } = parseType(p.type);

      if (language === 'cpp') {
        const useRef = dimensions > 0;
        return useRef ? `${langType}& ${p.name}` : `${langType} ${p.name}`;
      } else if (language === 'java') {
        return `${langType} ${p.name}`;
      } else {
        return p.name;
      }
    }).join(', ');

    if (language === 'cpp') {
      return `${returnType} ${formData.functionName}(${params}) {\n    // Your code here\n    return {};\n}`;
    } else if (language === 'java') {
      return `public ${returnType} ${formData.functionName}(${params}) {\n    // Your code here\n    return null;\n}`;
    } else {
      return `def ${formData.functionName}(${params}):\n    # Your code here\n    return None`;
    }
  };

  // Type options with bracket notation for array dimensions
  // Format: INT (scalar), INT[] (1D array), INT[][] (2D array), etc.
  const typeOptions = [
    // Integers
    { value: 'INT', display: 'INT', description: 'Single integer' },
    { value: 'INT[]', display: 'INT[]', description: '1D array of integers' },
    { value: 'INT[][]', display: 'INT[][]', description: '2D array (matrix) of integers' },

    // Strings
    { value: 'STRING', display: 'STRING', description: 'Single string' },
    { value: 'STRING[]', display: 'STRING[]', description: '1D array of strings' },
    { value: 'STRING[][]', display: 'STRING[][]', description: '2D array of strings' },

    // Floats
    { value: 'FLOAT', display: 'FLOAT', description: 'Single float' },
    { value: 'FLOAT[]', display: 'FLOAT[]', description: '1D array of floats' },
    { value: 'FLOAT[][]', display: 'FLOAT[][]', description: '2D array of floats' },

    // Booleans
    { value: 'BOOL', display: 'BOOL', description: 'Single boolean' },
    { value: 'BOOL[]', display: 'BOOL[]', description: '1D array of booleans' },

    // Characters
    { value: 'CHAR', display: 'CHAR', description: 'Single character' },
    { value: 'CHAR[]', display: 'CHAR[]', description: '1D array of characters' }
  ];

  const handleSave = async () => {
    if (saving) {
      return;
    }
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
        input_format: formData.useLeetCodeStyle
          ? `Function parameters: ${formData.parameters.map(p => `${p.name} (${p.type})`).join(', ')}`
          : formData.inputFormat || 'Please specify the input format for this problem.',
        output_format: formData.useLeetCodeStyle
          ? `Function return: ${formData.returnType}`
          : formData.outputFormat,
        constraints: formData.constraints,
        sample_input: '',
        sample_output: '',
        time_limit: formData.timeLimit,
        memory_limit: formData.memoryLimit,
        difficulty: formData.difficulty,
        max_points: formData.points,
        // LeetCode-style fields
        uses_leetcode_style: formData.useLeetCodeStyle,
        function_name: formData.functionName,
        function_parameters: JSON.stringify(formData.parameters),
        return_type: formData.returnType,
        parameter_descriptions: formData.parameters.map(p => `${p.name}: ${p.description || p.type}`).join('\n')
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
              Create Problem
            </h2>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #212529',
              boxShadow: '8px 8px 0px #212529',
              padding: '32px 24px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                  Problem Name
                </label>
                <input
                  type="text"
                  value={formData.problemName}
                  onChange={(e) => handleInputChange('problemName')(e.target.value)}
                  placeholder="Enter the problem name"
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
                  color: '#212529',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  fontFamily: "'Press Start 2P', cursive",
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
                    border: '3px solid #212529',
                    fontSize: '0.8rem',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    fontFamily: "system-ui, sans-serif",
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{
                  fontSize: '0.65rem',
                  color: '#6b7280',
                  marginTop: '8px',
                  lineHeight: '1.6',
                }}>
                  Teams earn partial points based on test cases passed
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginTop: '8px',
                }}
              >
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    fontFamily: "'Press Start 2P', cursive",
                  }}>
                    Time Limit (ms)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={30000}
                    value={formData.timeLimit}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) {
                        handleInputChange('timeLimit')(formData.timeLimit);
                      } else {
                        const clamped = Math.min(Math.max(value, 100), 30000);
                        handleInputChange('timeLimit')(clamped);
                      }
                    }}
                    placeholder="e.g., 1000"
                    style={{
                      width: '100%',
                      border: '3px solid #212529',
                      fontSize: '0.8rem',
                      padding: '12px 16px',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      fontFamily: 'system-ui, sans-serif',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{
                    fontSize: '0.6rem',
                    color: '#6b7280',
                    marginTop: '6px',
                    lineHeight: '1.6',
                  }}>
                    Must be between 100 and 30000 milliseconds.
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    fontFamily: "'Press Start 2P', cursive",
                  }}>
                    Memory Limit (MB)
                  </label>
                  <input
                    type="number"
                    min={16}
                    max={2048}
                    value={formData.memoryLimit}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) {
                        handleInputChange('memoryLimit')(formData.memoryLimit);
                      } else {
                        const clamped = Math.min(Math.max(value, 16), 2048);
                        handleInputChange('memoryLimit')(clamped);
                      }
                    }}
                    placeholder="e.g., 256"
                    style={{
                      width: '100%',
                      border: '3px solid #212529',
                      fontSize: '0.8rem',
                      padding: '12px 16px',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      fontFamily: 'system-ui, sans-serif',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{
                    fontSize: '0.6rem',
                    color: '#6b7280',
                    marginTop: '6px',
                    lineHeight: '1.6',
                  }}>
                    Must be between 16 and 2048 megabytes.
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#212529',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    fontFamily: "'Press Start 2P', cursive",
                  }}>
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty')(e.target.value as 'easy' | 'medium' | 'hard')}
                    style={{
                      width: '100%',
                      border: '3px solid #212529',
                      fontSize: '0.8rem',
                      padding: '12px 16px',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      fontFamily: 'system-ui, sans-serif',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <p style={{
                    fontSize: '0.6rem',
                    color: '#6b7280',
                    marginTop: '6px',
                    lineHeight: '1.6',
                  }}>
                    Choose how this problem will be labeled for teams.
                  </p>
                </div>
              </div>

              {/* Function Configuration (LeetCode-Style - Always Enabled) */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f0f9ff',
                  border: '3px solid #212529',
                  boxShadow: '4px 4px 0px #212529',
                }}>
                  <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: '#212529',
                    fontFamily: "'Press Start 2P', cursive"
                  }}>
                    Function Config
                  </h3>

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
                      value={formData.functionName}
                      onChange={(e) => handleInputChange('functionName')(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #212529',
                        fontSize: '0.75rem',
                        fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., twoSum, findMaximum"
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
                      value={formData.returnType}
                      onChange={(e) => handleInputChange('returnType')(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #212529',
                        fontSize: '0.75rem',
                        boxSizing: 'border-box',
                        fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
                      }}
                    >
                      {typeOptions.map(type => (
                        <option key={type.value} value={type.value} title={type.description}>
                          {type.display}
                        </option>
                      ))}
                    </select>
                    <p style={{
                      fontSize: '0.55rem',
                      color: '#6b7280',
                      marginTop: '6px',
                      lineHeight: '1.4',
                    }}>
                      {typeOptions.find(t => t.value === formData.returnType)?.description}
                    </p>
                  </div>

                  {/* Parameters */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                      <label style={{
                        fontWeight: 'bold',
                        color: '#212529',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive"
                      }}>
                        Parameters
                      </label>
                      <button
                        type="button"
                        onClick={addParameter}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: '2px solid #212529',
                          fontSize: '0.55rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontFamily: "'Press Start 2P', cursive",
                          boxShadow: '2px 2px 0px #212529',
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {formData.parameters.map((param, index) => (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 2fr auto',
                        gap: '8px',
                        alignItems: 'end',
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: '#ffffff',
                        border: '2px solid #212529'
                      }}>
                        <div>
                          <label style={{ fontSize: '0.55rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            Name
                          </label>
                          <input
                            type="text"
                            value={param.name}
                            onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.7rem',
                              boxSizing: 'border-box'
                            }}
                            placeholder="nums"
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
                              boxSizing: 'border-box',
                              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
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
                            Description
                          </label>
                          <input
                            type="text"
                            value={param.description || ''}
                            onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                            placeholder="Brief desc"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.7rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeParameter(index)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: '2px solid #212529',
                            fontSize: '0.55rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '2px 2px 0px #212529',
                          }}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Function Preview */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '12px',
                      fontWeight: 'bold',
                      color: '#212529',
                      fontSize: '0.6rem',
                      fontFamily: "'Press Start 2P', cursive"
                    }}>
                      Function Preview
                    </label>

                    {/* C++ Preview */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        backgroundColor: '#0c4a6e',
                        color: '#ffffff',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive",
                        borderRadius: '4px 4px 0 0',
                        border: '2px solid #212529',
                        borderBottom: 'none'
                      }}>
                        C++
                      </div>
                      <pre style={{
                        backgroundColor: '#1f2937',
                        color: '#f8fafc',
                        padding: '14px',
                        border: '2px solid #212529',
                        fontSize: '0.7rem',
                        fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                        overflow: 'auto',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        {generatePreview('cpp')}
                      </pre>
                    </div>

                    {/* Java Preview */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        backgroundColor: '#0c4a6e',
                        color: '#ffffff',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive",
                        borderRadius: '4px 4px 0 0',
                        border: '2px solid #212529',
                        borderBottom: 'none'
                      }}>
                        Java
                      </div>
                      <pre style={{
                        backgroundColor: '#1f2937',
                        color: '#f8fafc',
                        padding: '14px',
                        border: '2px solid #212529',
                        fontSize: '0.7rem',
                        fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                        overflow: 'auto',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        {generatePreview('java')}
                      </pre>
                    </div>

                    {/* Python Preview */}
                    <div>
                      <div style={{
                        backgroundColor: '#0c4a6e',
                        color: '#ffffff',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', cursive",
                        borderRadius: '4px 4px 0 0',
                        border: '2px solid #212529',
                        borderBottom: 'none'
                      }}>
                        Python
                      </div>
                      <pre style={{
                        backgroundColor: '#1f2937',
                        color: '#f8fafc',
                        padding: '14px',
                        border: '2px solid #212529',
                        fontSize: '0.7rem',
                        fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                        overflow: 'auto',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        {generatePreview('python')}
                      </pre>
                    </div>
                  </div>
                </div>

          </div>
        </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/problems')}
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
              type="button"
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
              {saving ? 'Saving...' : 'Save Problem'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateProblemPage;
