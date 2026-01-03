import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}>
            ⚠️
          </div>
          <h2 style={{
            margin: '0 0 8px 0',
            color: 'var(--error-color, #ef4444)'
          }}>
            Something went wrong
          </h2>
          <p style={{
            margin: '0 0 16px 0',
            color: 'var(--text-secondary)',
            maxWidth: '400px'
          }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary-color, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '16px',
              textAlign: 'left',
              maxWidth: '600px',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Error Details (Development)
              </summary>
              <pre style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '8px',
                borderRadius: '4px',
                overflow: 'auto',
                fontFamily: 'monospace'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
