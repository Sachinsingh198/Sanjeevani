import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — Production-grade React Error Boundary.
 * Catches JavaScript runtime exceptions, lazy-loading chunks failures, and rendering faults.
 * Renders a compassionate, accessible bilingual fallback UI in Hindi & English.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Production error logging sink
    if (typeof console !== 'undefined' && console.error) {
      console.error('[Sanjeevani ErrorBoundary caught an unhandled error]:', error, errorInfo);
    }
    // Sentry hook if configured
    if (typeof window !== 'undefined' && window.__sanjeevani_sentry_capture) {
      window.__sanjeevani_sentry_capture(error, errorInfo);
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-mist/60 text-primary">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center flex flex-col items-center">
            {/* Warning Emblem */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Bilingual Message */}
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              कुछ गड़बड़ हुई • Something went wrong
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              चिंता न करें, आपका स्वास्थ्य डेटा सुरक्षित है। कृपया पेज पुनः लोड करें या मुख्य पृष्ठ पर जाएं।
              <br />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                Don't worry, your health data is safe. Please reload the page or return home.
              </span>
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-forest hover:bg-forest/90 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>पुनः लोड करें / Reload</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>होम / Home</span>
              </button>
            </div>

            {/* Collapsible Technical Details (Dev triage) */}
            {this.state.error && (
              <details className="mt-6 text-left w-full text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                <summary className="cursor-pointer hover:underline font-mono">
                  तकनीकी विवरण / Technical details
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg overflow-x-auto text-[11px] font-mono border border-gray-200 dark:border-gray-800 text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
