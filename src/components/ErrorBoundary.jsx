import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SmartSchedule caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 antialiased">
          <div className="bg-white rounded-panel p-8 sm:p-10 border border-line shadow-soft max-w-lg w-full text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-navy-900">
                Something went wrong
              </h2>
              <p className="text-muted text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                An unexpected error occurred while rendering this view. Your saved preferences and timetable database are safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-surface p-3.5 rounded-xl border border-line text-left font-mono text-[11px] text-red-800 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-lime-300" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-surface hover:bg-slate-100 text-navy-900 border border-line font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-navy-700" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
