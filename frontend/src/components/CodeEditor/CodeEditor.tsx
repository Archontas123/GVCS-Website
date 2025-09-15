import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { MdCheck, MdClose, MdLightbulb, MdSave, MdPlayArrow } from 'react-icons/md';
import '../../styles/theme.css';

const codeEditorStyles = `
  .code-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid #e1e5e9;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    padding: 12px 16px;
    border-bottom: 1px solid #e1e5e9;
  }

  .language-selector {
    display: flex;
    gap: 8px;
  }

  .lang-btn {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #374151;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .lang-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #2563eb;
  }

  .lang-btn.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .lang-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .editor-status {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .saving {
    color: #ffa500;
    animation: pulse 1.5s ease-in-out infinite alternate;
  }

  .saved {
    color: #4caf50;
  }

  @keyframes pulse {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }

  .editor-container {
    flex: 1;
    min-height: 400px;
    background: #ffffff;
  }

  .editor-wrapper {
    height: 100%;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    overflow: hidden;
  }

  .test-section {
    background: #f8f9fa;
    border-top: 1px solid #e1e5e9;
    padding: 16px;
  }

  .test-input {
    margin-bottom: 16px;
  }

  .test-input label {
    display: block;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .test-input textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px 12px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    color: #374151;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .test-input textarea:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }

  .test-input textarea::placeholder {
    color: #9ca3af;
  }

  .test-input textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .editor-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .test-btn, .submit-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
  }

  .test-btn {
    background: #0e639c;
    color: white;
  }

  .test-btn:hover:not(:disabled) {
    background: #1177bb;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(14, 99, 156, 0.3);
  }

  .submit-btn {
    background: #16a085;
    color: white;
  }

  .submit-btn:hover:not(:disabled) {
    background: #1abc9c;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(22, 160, 133, 0.3);
  }

  .test-btn:disabled, .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .test-result {
    margin-top: 16px;
    background: #ffffff;
    border-radius: 6px;
    overflow: hidden;
    border-left: 4px solid;
    border: 1px solid #e1e5e9;
  }

  .test-result.success {
    border-left-color: #10b981;
    background: #f0fdf4;
  }

  .test-result.error {
    border-left-color: #ef4444;
    background: #fef2f2;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.02);
    border-bottom: 1px solid #e1e5e9;
  }

  .result-status {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .test-result.success .result-status {
    color: #059669;
  }

  .test-result.error .result-status {
    color: #dc2626;
  }

  .execution-time {
    font-size: 0.75rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .result-section {
    padding: 12px 16px;
  }

  .result-section:not(:last-child) {
    border-bottom: 1px solid #e1e5e9;
  }

  .result-section strong {
    display: block;
    color: #374151;
    font-size: 0.875rem;
    margin-bottom: 8px;
  }

  .result-content {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #e1e5e9;
    color: #374151;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    overflow-x: auto;
  }

  .result-content.error {
    color: #dc2626;
    border-color: #fca5a5;
    background: #fef2f2;
  }

  .editor-help {
    background: #f8f9fa;
    border-top: 1px solid #e1e5e9;
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .help-item {
    font-size: 0.75rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .help-item strong {
    color: #1f2937;
  }

  @media (max-width: 768px) {
    .editor-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .language-selector {
      justify-content: center;
    }

    .editor-status {
      justify-content: center;
    }

    .editor-actions {
      flex-direction: column;
      gap: 8px;
    }

    .test-btn, .submit-btn {
      width: 100%;
    }

    .editor-help {
      flex-direction: column;
      gap: 8px;
    }

    .help-item {
      justify-content: flex-start;
    }
  }

  @media (max-width: 480px) {
    .editor-container {
      min-height: 300px;
    }
    
    .test-input textarea {
      min-height: 60px;
    }
    
    .lang-btn {
      padding: 8px 12px;
      font-size: 0.8125rem;
    }
  }
`;


interface CodeEditorProps {
  problemId?: number;
  initialCode?: string;
  initialLanguage?: string;
  value?: string;
  onChange?: (value: string) => void;
  onLanguageChange?: (language: string) => void;
  onSubmit?: (code: string, language: string) => void;
  onTest?: (code: string, language: string, input: string) => void;
  height?: string | number;
  readOnly?: boolean;
  isLoading?: boolean;
  testResult?: {
    success: boolean;
    output: string;
    error: string;
    executionTime: number;
  } | null;
}


const CodeEditor: React.FC<CodeEditorProps> = ({
  problemId,
  initialCode,
  initialLanguage = 'cpp',
  value,
  onChange,
  onLanguageChange,
  onSubmit,
  onTest,
  height = '400px',
  readOnly = false,
  isLoading = false,
  testResult = null,
}) => {
  const [language, setLanguage] = useState<'cpp' | 'java' | 'python'>(initialLanguage as 'cpp' | 'java' | 'python');
  const [code, setCode] = useState<string>(value || initialCode || '// Loading...');
  const [testInput, setTestInput] = useState('');
  
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (onChange) {
      onChange(code);
    }
  }, [code, onChange]);

  useEffect(() => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  }, [language, onLanguageChange]);

  const loadCode = useCallback(async () => {
    if (!problemId) return;
    
    setIsLoadingSignature(true);
    try {
      const token = localStorage.getItem('teamToken');
      
      const response = await fetch(
        `/api/problems/${problemId}/code/${language}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCode(data.data.code);
      } else {
        const signatureResponse = await fetch(
          `/api/problems/${problemId}/signature/${language}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (signatureResponse.ok) {
          const signatureData = await signatureResponse.json();
          setCode(signatureData.data.signature);
        } else {
          setCode('// Error loading function signature');
        }
      }
    } catch (error) {
      console.error('Error loading code:', error);
      setCode('// Error loading function signature');
    } finally {
      setIsLoadingSignature(false);
    }
  }, [problemId, language]);

  const saveCode = useCallback(async (codeToSave: string) => {
    if (!problemId || isLoadingSignature || codeToSave === '// Loading...' || codeToSave === '// Error loading function signature') {
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('teamToken');
      
      const response = await fetch(
        `/api/problems/${problemId}/code/${language}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: codeToSave })
        }
      );

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving code:', error);
    } finally {
      setIsSaving(false);
    }
  }, [problemId, language, isLoadingSignature]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleCodeChangeWithSave = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onChange?.(newCode);

    const saveTimer = setTimeout(() => {
      saveCode(newCode);
    }, 2000);
    return () => clearTimeout(saveTimer);
  }, [onChange, saveCode]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (code && !isLoadingSignature) {
      saveCode(code);
    }
    setLanguage(newLanguage as 'cpp' | 'java' | 'python');
    onLanguageChange?.(newLanguage);
  }, [code, isLoadingSignature, saveCode, onLanguageChange]);

  const handleTest = useCallback(() => {
    if (code && onTest) {
      saveCode(code); 
      onTest(code, language, testInput);
    }
  }, [code, onTest, saveCode, language, testInput]);

  const handleSubmit = useCallback(() => {
    if (code && onSubmit) {
      saveCode(code); 
      onSubmit(code, language);
    }
  }, [code, onSubmit, saveCode, language]);

  const LANGUAGES = [
    { id: 'cpp', name: 'C++', monaco: 'cpp' },
    { id: 'java', name: 'Java', monaco: 'java' },
    { id: 'python', name: 'Python', monaco: 'python' }
  ];

  const currentLanguage = LANGUAGES.find(l => l.id === language);

  return (
    <>
      <style>{codeEditorStyles}</style>
      <div className="code-editor">
        <div className="editor-header">
          <div className="language-selector">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                className={`lang-btn ${language === lang.id ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.id)}
                disabled={isLoading || isLoadingSignature}
              >
                {lang.name}
              </button>
            ))}
          </div>
            
            <div className="editor-status">
              {isSaving && <span className="saving">Saving...</span>}
              {lastSaved && !isSaving && (
                <span className="saved">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <div className="editor-container">
            <div className="editor-wrapper">
              <Editor
                height="400px"
                language={currentLanguage?.monaco}
                value={code}
                onChange={handleCodeChangeWithSave}
                loading={isLoadingSignature ? 'Loading function signature...' : undefined}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  tabSize: 4,
                  insertSpaces: true
                }}
              />
            </div>
          </div>

          <div className="test-section">
            <div className="test-input">
              <label htmlFor="test-input">Test Input (optional):</label>
              <textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter test input here..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="editor-actions">
              <button
                className="test-btn"
                onClick={handleTest}
                disabled={isLoading || isLoadingSignature || !code.trim()}
              >
                {isLoading ? 'Testing...' : 'Test Code'}
              </button>
              
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isLoading || isLoadingSignature || !code.trim()}
              >
                {isLoading ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-status">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {testResult.success ? <><MdCheck /> Test Passed</> : <><MdClose /> Test Failed</>}
                  </span>
                </span>
                <span className="execution-time">
                  {testResult.executionTime}ms
                </span>
              </div>
              
              {testResult.output && (
                <div className="result-section">
                  <strong>Output:</strong>
                  <pre className="result-content">{testResult.output}</pre>
                </div>
              )}
              
              {testResult.error && (
                <div className="result-section">
                  <strong>Error:</strong>
                  <pre className="result-content error">{testResult.error}</pre>
                </div>
              )}
            </div>
          )}

          <div className="editor-help">
            <div className="help-item">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdLightbulb /> Code Editor:
              </strong> Write your solution function - I/O is handled automatically
            </div>
            <div className="help-item">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdSave /> Auto-save:
              </strong> Your code is automatically saved as you type
            </div>
            <div className="help-item">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MdPlayArrow /> Testing:
              </strong> Use the test button to run your code with custom input
            </div>
          </div>
        </div>
      </>
    );
};

export type { CodeEditorProps };

export default CodeEditor;
