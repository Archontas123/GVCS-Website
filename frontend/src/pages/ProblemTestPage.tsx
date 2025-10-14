import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';

interface Problem {
  id: number;
  title: string;
  description: string;
  contestId: number;
  contestName?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  memoryLimit: number;
  functionName?: string;
  parameters?: Array<{ name: string; type: string; description?: string }>;
  returnType?: string;
}

interface Contest {
  id: number;
  contestName: string;
}

interface SubmissionResult {
  verdict: string;
  exitCode: number;
  output: string;
  error: string;
  executionTime: number;
  memoryUsed: number;
  testCaseResults?: Array<{
    passed: boolean;
    input: any;
    expected: any;
    actual: any;
    error?: string;
  }>;
}

const ProblemTestPage: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<'cpp' | 'java' | 'python'>('cpp');
  const [code, setCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string>('');

  // Language templates
  const languageTemplates = {
    cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

// Your solution here
int solution() {
    return 0;
}

int main() {
    cout << solution() << endl;
    return 0;
}`,
    java: `import java.util.*;
import java.io.*;

public class Solution {

    // Your solution here
    public static int solution() {
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(solution());
    }
}`,
    python: `# Your solution here
def solution():
    return 0

if __name__ == "__main__":
    print(solution())`
  };

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (contests.length > 0) {
      fetchProblems();
    }
  }, [contests]);

  useEffect(() => {
    if (selectedProblem) {
      // Use problem-specific function signature if available
      const problemSignature = getProblemSignature(selectedProblem, language);
      if (problemSignature) {
        setCode(problemSignature);
      } else {
        setCode(languageTemplates[language]);
      }
    } else {
      setCode(languageTemplates[language]);
    }
  }, [language, selectedProblem]);

  const fetchContests = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/test/problems');
      if (response.ok) {
        const data = await response.json();
        // Group problems by contest
        const contestMap = new Map();
        data.data?.forEach((problem: Problem) => {
          const contestId = problem.contestId;
          const contestName = problem.contestName || `Contest ${contestId}`;
          if (!contestMap.has(contestId)) {
            contestMap.set(contestId, {
              id: contestId,
              contestName: contestName
            });
          }
        });
        setContests(Array.from(contestMap.values()));
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
    }
  };

  const getProblemSignature = (problem: Problem, language: 'cpp' | 'java' | 'python'): string | null => {
    // Check if problem has function signatures stored
    const problemData = problem as any;

    switch (language) {
      case 'cpp':
        return problemData.function_signature_cpp || problemData.default_solution_cpp;
      case 'java':
        return problemData.function_signature_java || problemData.default_solution_java;
      case 'python':
        return problemData.function_signature_python || problemData.default_solution_python;
      default:
        return null;
    }
  };

  const fetchProblems = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/test/problems');
      if (response.ok) {
        const data = await response.json();
        const allProblems = (data.data || []).map((problem: any) => ({
          id: problem.id,
          contestId: problem.contest_id,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          timeLimit: problem.time_limit,
          memoryLimit: problem.memory_limit,
          contestName: problem.contest_name,
          functionName: problem.function_name,
          parameters: problem.function_parameters,
          returnType: problem.return_type,
          // Include function signatures
          function_signature_cpp: problem.function_signature_cpp,
          function_signature_java: problem.function_signature_java,
          function_signature_python: problem.function_signature_python,
          default_solution_cpp: problem.default_solution_cpp,
          default_solution_java: problem.default_solution_java,
          default_solution_python: problem.default_solution_python
        }));
        setProblems(allProblems);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedProblem) {
      setError('Please select a problem first');
      return;
    }

    if (!code.trim()) {
      setError('Please write some code');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language: language,
          code: code
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError('Failed to submit code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'accepted':
        return '#16a34a';
      case 'wrong answer':
        return '#dc2626';
      case 'time limit exceeded':
        return '#d97706';
      case 'runtime error':
        return '#dc2626';
      case 'compilation error':
        return '#dc2626';
      case 'memory limit exceeded':
        return '#d97706';
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            margin: '0 0 20px 0',
            fontSize: '2rem',
            fontWeight: 700,
            color: '#1e293b'
          }}>
            Problem Test Environment
          </h1>

          {/* Problem Selection */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '16px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#374151'
              }}>
                Select Problem
              </label>
              <select
                value={selectedProblem?.id || ''}
                onChange={(e) => {
                  const problemId = parseInt(e.target.value);
                  const problem = problems.find(p => p.id === problemId);
                  setSelectedProblem(problem || null);

                  // Update code template when problem is selected
                  if (problem) {
                    const problemSignature = getProblemSignature(problem, language);
                    if (problemSignature) {
                      setCode(problemSignature);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Choose a problem...</option>
                {problems.map(problem => (
                  <option key={problem.id} value={problem.id}>
                    {problem.contestName} - {problem.title} ({problem.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#374151'
              }}>
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'cpp' | 'java' | 'python')}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minWidth: '120px'
                }}
              >
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </div>
          </div>
        </div>

        {selectedProblem && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            height: 'calc(100vh - 200px)'
          }}>
            {/* Problem Description */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              overflow: 'auto',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#1e293b'
              }}>
                {selectedProblem.title}
              </h2>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: selectedProblem.difficulty === 'easy' ? '#dcfce7' :
                                  selectedProblem.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                  color: selectedProblem.difficulty === 'easy' ? '#166534' :
                         selectedProblem.difficulty === 'medium' ? '#92400e' : '#991b1b',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {selectedProblem.difficulty.toUpperCase()}
                </span>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: '#f0f9ff',
                  color: '#0c4a6e',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  Time: {selectedProblem.timeLimit}ms
                </span>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: '#f0f9ff',
                  color: '#0c4a6e',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  Memory: {selectedProblem.memoryLimit}MB
                </span>
              </div>

              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: '#374151'
              }}>
                {selectedProblem.description}
              </div>

              {selectedProblem.functionName && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Function Signature
                  </h4>
                  <code style={{
                    fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                    fontSize: '14px',
                    color: '#1f2937'
                  }}>
                    {selectedProblem.functionName}(
                    {selectedProblem.parameters?.map(p => `${p.type} ${p.name}`).join(', ')}
                    ) → {selectedProblem.returnType}
                  </code>
                </div>
              )}
            </div>

            {/* Code Editor and Results */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Code Editor */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                flex: 1,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#1e293b'
                  }}>
                    Code Editor
                  </h3>

                  <button
                    onClick={handleSubmitCode}
                    disabled={submitting || !selectedProblem}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: submitting ? '#9ca3af' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {submitting ? 'Running...' : 'Run Code'}
                  </button>
                </div>

                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  height: '300px'
                }}>
                  <Editor
                    height="100%"
                    language={language === 'cpp' ? 'cpp' : language}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>

              {/* Results */}
              {(result || error) && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: '#1e293b'
                  }}>
                    Results
                  </h3>

                  {error && (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#dc2626',
                      fontSize: '14px'
                    }}>
                      {error}
                    </div>
                  )}

                  {result && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {/* Verdict */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{
                          padding: '6px 12px',
                          backgroundColor: getVerdictColor(result.verdict) + '20',
                          color: getVerdictColor(result.verdict),
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 600
                        }}>
                          {result.verdict}
                        </span>
                        <span style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          Time: {result.executionTime}ms | Memory: {Math.round(result.memoryUsed / 1024)}KB
                        </span>
                      </div>

                      {/* Output */}
                      {result.output && (
                        <div>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Output:
                          </h4>
                          <pre style={{
                            margin: 0,
                            padding: '12px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}>
                            {result.output}
                          </pre>
                        </div>
                      )}

                      {/* Error */}
                      {result.error && (
                        <div>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#dc2626'
                          }}>
                            Error:
                          </h4>
                          <pre style={{
                            margin: 0,
                            padding: '12px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
                            whiteSpace: 'pre-wrap',
                            color: '#dc2626',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}>
                            {result.error}
                          </pre>
                        </div>
                      )}

                      {/* Test Case Results */}
                      {result.testCaseResults && result.testCaseResults.length > 0 && (
                        <div>
                          <h4 style={{
                            margin: '0 0 12px 0',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Test Cases:
                          </h4>
                          {result.testCaseResults.map((testCase, index) => (
                            <div key={index} style={{
                              padding: '12px',
                              backgroundColor: testCase.passed ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${testCase.passed ? '#bbf7d0' : '#fecaca'}`,
                              borderRadius: '6px',
                              marginBottom: '8px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px'
                              }}>
                                <span style={{
                                  color: testCase.passed ? '#16a34a' : '#dc2626',
                                  fontWeight: 600,
                                  fontSize: '14px'
                                }}>
                                  Test Case {index + 1}: {testCase.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                              {!testCase.passed && (
                                <div style={{
                                  fontSize: '13px',
                                  color: '#6b7280',
                                  fontFamily: '"Fira Code", "Monaco", "Consolas", monospace'
                                }}>
                                  <div>Expected: {JSON.stringify(testCase.expected)}</div>
                                  <div>Got: {JSON.stringify(testCase.actual)}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemTestPage;