/**
 * CS Club Hackathon Platform - Code Editor Test Page
 * Phase 5.3: Standalone page for testing Monaco Editor features
 */

import React, { useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import apiService from '../services/api';

const CodeEditorTestPage: React.FC = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    verdict?: string;
    output?: string;
    executionTime?: number;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (code: string, language: string) => {
    console.log('Test submission:', { code, language });
    alert(`Code submission simulation:\n\nLanguage: ${language}\nCode length: ${code.length} characters\n\nThis is a test environment - no actual submission to judge.`);
  };

  const handleTest = async (code: string, language: string, input: string) => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Executing code:', { language, codeLength: code.length, input });
      const response = await apiService.testCode(language, code, input);
      
      if (response.success) {
        const result = response.data;
        setTestResult({
          success: true,
          verdict: result.verdict,
          output: result.output || '(no output)',
          executionTime: result.executionTime
        });
      } else {
        setTestResult({
          success: false,
          error: response.message || 'Test execution failed'
        });
      }
    } catch (err: any) {
      console.error('Code execution error:', err);
      setTestResult({
        success: false,
        error: err.response?.data?.message || err.message || 'An error occurred while executing code'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        <div className="card mb-4">
          <div className="card-content">
            <h1 className="flex align-center" style={{ gap: '8px', marginBottom: '16px' }}>
              Monaco Code Editor Demo
            </h1>
            <p className="text-secondary">
              This page demonstrates the Monaco Editor integration with competitive programming features and <strong>live code execution</strong>.
            </p>
          </div>
        </div>

      <div className="alert alert-info mb-4">
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Features to test:</strong>
        </p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Switch between C++, Java, and Python languages</li>
          <li>Use keyboard shortcuts: Ctrl+Enter (submit), Ctrl+Shift+F (format), Ctrl+F (find)</li>
          <li>Click the settings icon to customize font, theme, and editor options</li>
          <li>Click the fullscreen icon for distraction-free coding</li>
          <li>Try the code snippets dialog (find/replace icon)</li>
          <li><strong>Test with custom input using the test panel - this actually runs your code!</strong></li>
        </ul>
      </div>

      {testResult && (
        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'} mb-4`}>
          <div style={{ marginBottom: '12px' }}>
            <strong>{testResult.success ? '✅ Execution Result:' : '❌ Execution Failed:'}</strong>
          </div>
          
          {testResult.success ? (
            <div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Verdict:</strong> <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  backgroundColor: testResult.verdict === 'ACCEPTED' ? '#dcfce7' : '#fef2f2',
                  color: testResult.verdict === 'ACCEPTED' ? '#166534' : '#dc2626',
                  fontSize: '0.9em',
                  fontWeight: 600
                }}>{testResult.verdict}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Execution Time:</strong> {testResult.executionTime}ms
              </div>
              <div>
                <strong>Output:</strong>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '4px',
                  fontSize: '0.9em',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>{testResult.output}</pre>
              </div>
            </div>
          ) : (
            <div style={{ color: '#dc2626' }}>
              {testResult.error}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="alert alert-info mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Executing your code...</span>
          </div>
        </div>
      )}

      <div style={{ height: '600px' }}>
        <CodeEditor
          onSubmit={handleSubmit}
          onTest={handleTest}
          height="100%"
        />
      </div>

      <div className="card border mt-4" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="card-content">
          <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1rem' }}>
            Available Keyboard Shortcuts:
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '8px' 
          }}>
            <small className="text-secondary">Ctrl + Enter: Submit code</small>
            <small className="text-secondary">Ctrl + F: Find in code</small>
            <small className="text-secondary">Ctrl + H: Find and replace</small>
            <small className="text-secondary">Ctrl + Shift + F: Format code</small>
            <small className="text-secondary">Ctrl + /: Toggle comment</small>
            <small className="text-secondary">Alt + Click: Multiple cursors</small>
            <small className="text-secondary">Ctrl + D: Select next occurrence</small>
            <small className="text-secondary">F11: Toggle fullscreen</small>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default CodeEditorTestPage;