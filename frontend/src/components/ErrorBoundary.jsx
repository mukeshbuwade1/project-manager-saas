import React from 'react'
import { Link } from 'react-router-dom'

// ─── Fallback UI ──────────────────────────────────────────────────────────────

function ErrorScreen({ error, onReset }) {
  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">

        {/* Error icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-muted text-sm mb-4">
          An unexpected error occurred on this page. You can try again or go back to the dashboard.
        </p>

        {/* Show error message in development */}
        {isDev && error?.message && (
          <div className="mb-6 text-left">
            <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wide">Error</p>
            <pre className="text-red-400 text-xs font-mono bg-dark-elevated border border-red-500/20 px-3 py-2.5 rounded-lg overflow-auto text-left whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-dark-elevated border border-dark-border text-text-secondary hover:text-text-primary hover:border-dark-border-strong transition-all"
          >
            Try again
          </button>
          <Link
            to="/dashboard"
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Error Boundary class component ──────────────────────────────────────────
// Must be a class component — React does not support error boundaries as
// function components (no hook equivalent for componentDidCatch).

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', info.componentStack)
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }
    return this.props.children
  }
}

// ─── Convenience wrapper for use in JSX routes ────────────────────────────────
// Resets the boundary whenever the `resetKey` prop changes (e.g. on navigation).

export function ScreenBoundary({ children, resetKey }) {
  return (
    <ErrorBoundary key={resetKey}>
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
