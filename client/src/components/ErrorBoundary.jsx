import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production you could send this to a logging service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6 text-center">
        {/* Google-style coloured logo */}
        <div className="flex items-center gap-0.5 mb-6 select-none">
          {['A','n','u','r','a','g'].map((c, i) => (
            <span key={i} className="text-4xl font-bold"
              style={{ color: ['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853','#EA4335'][i] }}>
              {c}
            </span>
          ))}
        </div>

        <p className="text-[#202124] dark:text-[#e8eaed] text-lg font-medium mb-2">
          Something went wrong on this page.
        </p>
        <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mb-6 max-w-sm">
          An unexpected error occurred. The rest of the site is still working fine.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2 rounded-full text-sm bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2 rounded-full text-sm border border-[#dadce0] dark:border-[#5f6368]
                       text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            Go home
          </a>
        </div>

        {/* Show error detail in dev only */}
        {import.meta.env.DEV && (
          <pre className="mt-8 text-left text-xs text-[#c5221f] bg-[#fce8e6] dark:bg-[#3b1f1d] rounded-xl p-4 max-w-xl w-full overflow-auto">
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
