import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-4">😵</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6">Don't worry, your data is safe. Try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl text-white font-semibold mb-3"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              🔄 Refresh Page
            </button>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
               Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;