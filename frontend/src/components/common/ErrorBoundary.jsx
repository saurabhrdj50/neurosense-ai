import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 my-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-300">
                {this.props.title || 'Component Rendering Error'}
              </h3>
              <p className="text-xs text-slate-400">
                An unexpected error occurred while rendering this section.
              </p>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl font-mono text-xs text-rose-300 mb-4 overflow-x-auto">
            {this.state.error?.toString() || 'Unknown error'}
          </div>

          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition"
          >
            <RefreshCw size={14} />
            Retry Section
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
