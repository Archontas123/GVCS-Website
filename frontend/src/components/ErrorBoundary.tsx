import React, { Component, ErrorInfo, ReactNode } from 'react';
import '../styles/theme.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (process.env.NODE_ENV === 'production') {
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex-center p-3"
          style={{
            minHeight: '100vh',
            backgroundColor: 'var(--background-default)',
          }}
        >
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-content p-4">
              <div className="text-center mb-4">
                <div
                  style={{
                    fontSize: '48px',
                    color: 'var(--contest-wrong-answer)',
                    marginBottom: '16px',
                  }}
                >
                  🐛 
                </div> {/*TODO: Remove Emoji*/}
                <h1
                  className="mb-2"
                  style={{ fontWeight: 600, fontSize: '2rem' }}
                >
                  Oops! Something went wrong
                </h1>
                <p className="text-muted">
                  An unexpected error occurred while rendering this page.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="alert alert-error mb-3" style={{ textAlign: 'left' }}>
                  <div className="mb-2" style={{ fontSize: '0.875rem' }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        marginTop: '8px',
                        maxHeight: '200px',
                        overflow: 'auto',
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                      }}
                    >
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex justify-center" style={{ gap: '16px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={this.handleRetry}
                  style={{ padding: '12px 24px' }}
                >
                  🔄 Try Again {/*TODO: Remove Emoji*/}
                </button>
                <button
                  className="btn btn-outlined"
                  onClick={this.handleReload}
                  style={{ padding: '12px 24px' }}
                >
                  Reload Page
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                  If this problem persists, please contact the contest organizer.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;