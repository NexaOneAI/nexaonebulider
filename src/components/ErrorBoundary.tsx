import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary — prevents white-screen-of-death in production.
 * Logs the failing component stack to console.error for diagnostics.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Component crashed:', error);
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReload = () => {
    try {
      // Best-effort: clear caches + unregister SW so a stale cache cannot
      // re-trigger the same error after reload.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    } finally {
      window.location.reload();
    }
  };

  handleClearLocal = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
    } catch {
      /* ignore */
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0b10',
          color: '#e6e7ea',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #1e90ff, #8a4dff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 8, fontWeight: 600 }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20, lineHeight: 1.5 }}>
            La aplicación encontró un error inesperado. Recarga la página para reintentar.
          </p>
          {this.state.error?.message && (
            <pre
              style={{
                fontSize: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: 160,
                color: '#ff8a8a',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1e90ff, #8a4dff)',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Recargar preview
            </button>
            <button
              type="button"
              onClick={this.handleClearLocal}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                color: '#e6e7ea',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Limpiar sesión local
            </button>
          </div>
        </div>
      </div>
    );
  }
}
