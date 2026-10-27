import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-darkbg flex items-center justify-center p-4">
          <div className="max-w-lg w-full glass-panel p-8 rounded-2xl text-center border border-red-500/20 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 text-3xl">
              💥
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-4 text-sm">
              An unexpected error occurred while rendering this page. You can try refreshing the page or returning home.
            </p>

            {this.state.error && (
              <div className="text-left bg-black/50 p-3 rounded-xl mb-6 text-xs font-mono text-red-300 border border-red-500/20 overflow-x-auto max-h-36">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-blue-500/20"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleHome}
                className="px-5 py-2.5 bg-surface-elevated hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition border border-gray-700"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
