import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Cadence crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            fontFamily: 'Inter, system-ui, sans-serif',
            background: '#f8fafc',
            color: '#0f172a',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#64748b', marginBottom: 16 }}>
              Cadence hit an error loading this page. Try a hard refresh (Ctrl + Shift + R).
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.assign('/login')}
              style={{
                marginTop: 20,
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Back to login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
