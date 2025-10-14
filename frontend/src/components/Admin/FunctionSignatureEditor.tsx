import React, { useState, useEffect } from 'react';

interface FunctionSignatures {
  cpp: string;
  java: string;
  python: string;
}

interface IOWrappers {
  cpp: string;
  java: string;
  python: string;
}

interface Props {
  problemId?: number;
  onSave: (signatures: FunctionSignatures, wrappers: IOWrappers) => void;
  onCancel: () => void;
}

const FunctionSignatureEditor: React.FC<Props> = ({ problemId, onSave, onCancel }) => {
  const [signatures, setSignatures] = useState<FunctionSignatures>({
    cpp: '',
    java: '',
    python: ''
  });

  const [wrappers, setWrappers] = useState<IOWrappers>({
    cpp: '',
    java: '',
    python: ''
  });

  const [activeTab, setActiveTab] = useState<'cpp' | 'java' | 'python'>('cpp');
  const [activeSection, setActiveSection] = useState<'signature' | 'wrapper'>('signature');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingTemplates, setHasExistingTemplates] = useState(false);

  useEffect(() => {
    if (problemId) {
      loadExistingTemplates();
    }
  }, [problemId]);

  const loadExistingTemplates = async () => {
    if (!problemId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/problems/${problemId}/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('programming_contest_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSignatures(data.data.signatures || { cpp: '', java: '', python: '' });
          setWrappers(data.data.wrappers || { cpp: '', java: '', python: '' });
          setHasExistingTemplates(true);
        } else {
          setHasExistingTemplates(false);
        }
      } else if (response.status === 404) {
        setHasExistingTemplates(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (language: keyof FunctionSignatures, value: string) => {
    setSignatures(prev => ({
      ...prev,
      [language]: value
    }));
  };

  const handleWrapperChange = (language: keyof IOWrappers, value: string) => {
    setWrappers(prev => ({
      ...prev,
      [language]: value
    }));
  };

  const handleSave = () => {
    onSave(signatures, wrappers);
  };

  const getLanguageDisplay = (lang: string) => {
    const displays = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python'
    };
    return displays[lang as keyof typeof displays];
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(29, 78, 216, 0.08)',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
        paddingBottom: '24px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#1d4ed8',
          fontSize: '1.75rem',
          fontWeight: 700,
          letterSpacing: '-0.02em'
        }}>
          Function Signature & I/O Template Editor
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            style={{
              padding: '12px 20px',
              border: `2px solid ${activeSection === 'signature' ? '#1d4ed8' : '#e2e8f0'}`,
              backgroundColor: activeSection === 'signature' ? '#1d4ed8' : '#ffffff',
              color: activeSection === 'signature' ? '#ffffff' : '#475569',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
            onClick={() => setActiveSection('signature')}
            onMouseEnter={(e) => {
              if (activeSection !== 'signature') {
                e.currentTarget.style.borderColor = '#cbd5e0';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== 'signature') {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
          >
            Function Signatures (User Sees)
          </button>
          <button 
            style={{
              padding: '12px 20px',
              border: `2px solid ${activeSection === 'wrapper' ? '#1d4ed8' : '#e2e8f0'}`,
              backgroundColor: activeSection === 'wrapper' ? '#1d4ed8' : '#ffffff',
              color: activeSection === 'wrapper' ? '#ffffff' : '#475569',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
            onClick={() => setActiveSection('wrapper')}
            onMouseEnter={(e) => {
              if (activeSection !== 'wrapper') {
                e.currentTarget.style.borderColor = '#cbd5e0';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== 'wrapper') {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
          >
            I/O Wrappers (Hidden)
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
        marginBottom: '32px'
      }}>
        {(['cpp', 'java', 'python'] as const).map(lang => (
          <button
            key={lang}
            style={{
              padding: '16px 32px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === lang ? '#1d4ed8' : '#718096',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              borderBottom: `3px solid ${activeTab === lang ? '#1d4ed8' : 'transparent'}`,
              transition: 'all 0.2s ease',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
            onClick={() => setActiveTab(lang)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4a5568';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = activeTab === lang ? '#1d4ed8' : '#718096';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {getLanguageDisplay(lang)}
          </button>
        ))}
      </div>

      <div style={{ minHeight: '500px' }}>
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            color: '#6b7280',
            fontSize: '1rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #1d4ed8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Loading templates...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '20px',
            margin: '20px 0',
            color: '#dc2626',
            fontSize: '0.9rem',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            <div style={{
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Error loading templates
            </div>
            <div>{error}</div>
            <button
              onClick={() => loadExistingTemplates()}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && !hasExistingTemplates && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '24px',
            margin: '20px 0',
            textAlign: 'center',
            color: '#0369a1',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              No templates found
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#075985',
              marginBottom: '16px'
            }}>
              Create new function signatures and I/O wrappers for this problem
            </div>
          </div>
        )}

        {!loading && !error && activeSection === 'signature' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label 
              htmlFor={`signature-${activeTab}`}
              style={{
                fontWeight: 600,
                color: '#2d3748',
                fontSize: '1rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}
            >
              Function Signature ({getLanguageDisplay(activeTab)}) - What users see and edit:
            </label>
            <textarea
              id={`signature-${activeTab}`}
              value={signatures[activeTab]}
              onChange={(e) => handleSignatureChange(activeTab, e.target.value)}
              rows={10}
              placeholder={`Enter the function signature for ${getLanguageDisplay(activeTab)}...`}
              style={{
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: 1.5,
                padding: '20px',
                border: '2px solid #68d391',
                borderRadius: '12px',
                resize: 'vertical',
                backgroundColor: '#f0fff4',
                color: '#2d3748',
                outline: 'none',
                transition: 'all 0.2s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1d4ed8';
                e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#68d391';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              backgroundColor: '#edf2f7',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: '4px solid #1d4ed8'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#2d3748',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                Tips for Function Signatures:
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                color: '#4a5568',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                <li style={{ marginBottom: '8px' }}>Users only see and edit this function</li>
                <li style={{ marginBottom: '8px' }}>Include parameter names that match your I/O parsing</li>
                <li style={{ marginBottom: '8px' }}>Add helpful comments inside the function body</li>
                <li style={{ marginBottom: '8px' }}>Make sure return type matches expected output format</li>
              </ul>
            </div>
          </div>
        )}

        {!loading && !error && activeSection === 'wrapper' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label 
              htmlFor={`wrapper-${activeTab}`}
              style={{
                fontWeight: 600,
                color: '#2d3748',
                fontSize: '1rem',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}
            >
              I/O Wrapper ({getLanguageDisplay(activeTab)}) - Hidden from users:
            </label>
            <textarea
              id={`wrapper-${activeTab}`}
              value={wrappers[activeTab]}
              onChange={(e) => handleWrapperChange(activeTab, e.target.value)}
              rows={18}
              placeholder={`Enter the I/O wrapper template for ${getLanguageDisplay(activeTab)}...`}
              style={{
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: 1.5,
                padding: '20px',
                border: '2px solid #fbb040',
                borderRadius: '12px',
                resize: 'vertical',
                backgroundColor: '#fffaf0',
                color: '#2d3748',
                outline: 'none',
                transition: 'all 0.2s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1d4ed8';
                e.target.style.boxShadow = '0 0 0 3px rgba(29, 78, 216, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#fbb040';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              backgroundColor: '#edf2f7',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: '4px solid #1d4ed8'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#2d3748',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                I/O Wrapper Guidelines:
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                color: '#4a5568',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>
                <li style={{ marginBottom: '8px' }}>
                  Use <code style={{
                    backgroundColor: '#fed7d7',
                    color: '#e53e3e',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace'
                  }}>&#123;USER_FUNCTION&#125;</code> placeholder for user's function
                </li>
                <li style={{ marginBottom: '8px' }}>Handle JSON input parsing from stdin</li>
                <li style={{ marginBottom: '8px' }}>Call user's function with parsed parameters</li>
                <li style={{ marginBottom: '8px' }}>Output result in expected format</li>
                <li style={{ marginBottom: '8px' }}>Include all necessary imports/includes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '16px',
        marginTop: '40px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        <button 
          onClick={onCancel}
          style={{
            padding: '14px 28px',
            border: '2px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.2s ease',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e0';
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          style={{
            padding: '14px 28px',
            border: '2px solid #1d4ed8',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            color: '#ffffff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.2s ease',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            boxShadow: '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(29, 78, 216, 0.35), 0 8px 20px rgba(37, 99, 235, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(29, 78, 216, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)';
          }}
        >
          Save Templates
        </button>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default FunctionSignatureEditor;