import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { MdCheck, MdClose, MdLightbulb, MdSave, MdPlayArrow } from 'react-icons/md';
import '../../styles/theme.css';
import apiService from '../../services/api';

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
    padding: 8px 16px;
    border: 3px solid #212529;
    background: #ffffff;
    color: #212529;
    cursor: pointer;
    font-size: 0.65rem;
    font-weight: bold;
    transition: all 0.15s ease-in-out;
    font-family: 'Press Start 2P', cursive;
    box-shadow: 3px 3px 0px #212529;
  }

  .lang-btn:hover:not(:disabled) {
    background: #e5e7eb;
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0px #212529;
  }

  .lang-btn.active {
    background: #2D58A6;
    color: white;
    text-shadow: 2px 2px 0px #212529;
  }

  .lang-btn:disabled {
    opacity: 0.6;
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
    padding: 12px 20px;
    border: 4px solid #212529;
    font-size: 0.65rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    min-width: 140px;
    font-family: 'Press Start 2P', cursive;
  }

  .test-btn {
    background: #2D58A6;
    color: white;
    box-shadow: 4px 4px 0px #212529;
    text-shadow: 2px 2px 0px #212529;
  }

  .test-btn:hover:not(:disabled) {
    background: #3B6BBD;
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px #212529;
  }

  .submit-btn {
    background: #16a085;
    color: white;
    box-shadow: 4px 4px 0px #212529;
    text-shadow: 2px 2px 0px #212529;
  }

  .submit-btn:hover:not(:disabled) {
    background: #1abc9c;
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px #212529;
  }

  .test-btn:disabled, .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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
      font-size: 0.6rem;
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
  showTestingControls?: boolean;
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
  showTestingControls = true,
}) => {
  const [language, setLanguage] = useState<'cpp' | 'java' | 'python'>(initialLanguage as 'cpp' | 'java' | 'python');
  const [code, setCode] = useState<string>(value || initialCode || '// Loading...');
  const [testInput, setTestInput] = useState('');
  
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<void>>(Promise.resolve());
  const saveRequestIdRef = useRef(0);
  const lastSavedCodeRef = useRef(code);

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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const loadCode = useCallback(async () => {
    if (!problemId) return;
    
    setIsLoadingSignature(true);
    try {
      const token = apiService.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/problems/${problemId}/code/${language}`,
        {
          headers
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCode(data.data.code);
        lastSavedCodeRef.current = data.data.code;
      } else {
        const signatureResponse = await fetch(
          `/api/problems/${problemId}/signature/${language}`,
          {
            headers
          }
        );

        if (signatureResponse.ok) {
          const signatureData = await signatureResponse.json();
          setCode(signatureData.data.signature);
          lastSavedCodeRef.current = signatureData.data.signature;
        } else {
          setCode('// Error loading function signature');
          lastSavedCodeRef.current = '// Error loading function signature';
        }
      }
    } catch (error) {
      console.error('Error loading code:', error);
      setCode('// Error loading function signature');
      lastSavedCodeRef.current = '// Error loading function signature';
    } finally {
      setIsLoadingSignature(false);
    }
  }, [problemId, language]);

  const saveCode = useCallback((codeToSave: string) => {
    if (!problemId || isLoadingSignature || codeToSave === '// Loading...' || codeToSave === '// Error loading function signature') {
      return Promise.resolve();
    }

    if (codeToSave === lastSavedCodeRef.current) {
      return Promise.resolve();
    }

    const token = apiService.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const currentSaveId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = currentSaveId;

    const executeSave = async () => {
      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/problems/${problemId}/code/${language}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ code: codeToSave })
          }
        );

        if (response.ok && saveRequestIdRef.current === currentSaveId) {
          lastSavedCodeRef.current = codeToSave;
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Error saving code:', error);
      } finally {
        if (saveRequestIdRef.current === currentSaveId) {
          setIsSaving(false);
        }
      }
    };

    savePromiseRef.current = savePromiseRef.current.then(executeSave);
    return savePromiseRef.current;
  }, [problemId, language, isLoadingSignature]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleCodeChangeWithSave = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onChange?.(newCode);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveCode(newCode);
    }, 2000);
  }, [onChange, saveCode]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (code && !isLoadingSignature) {
      saveCode(code);
    }
    setLanguage(newLanguage as 'cpp' | 'java' | 'python');
    onLanguageChange?.(newLanguage);
  }, [code, isLoadingSignature, saveCode, onLanguageChange]);

  const handleTest = useCallback(() => {
    if (showTestingControls && code && onTest) {
      saveCode(code); 
      onTest(code, language, testInput);
    }
  }, [code, onTest, saveCode, language, testInput, showTestingControls]);

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
            {showTestingControls && (
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
            )}

            <div className="editor-actions">
              {showTestingControls && (
                <button
                  className="test-btn"
                  onClick={handleTest}
                  disabled={isLoading || isLoadingSignature || !code.trim()}
                >
                  {isLoading ? 'Testing...' : 'Test Code'}
                </button>
              )}
              
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isLoading || isLoadingSignature || !code.trim()}
              >
                {isLoading ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {showTestingControls && testResult && (
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
        </div>
      </>
    );
};

export type { CodeEditorProps };

export default CodeEditor;
