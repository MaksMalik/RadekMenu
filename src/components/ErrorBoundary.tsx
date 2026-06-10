import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, info: React.ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? undefined });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              Coś poszło nie tak
            </h1>
            <p className="text-slate-500 mb-6">
              Przepraszamy, wystąpił nieoczekiwany błąd.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 text-left bg-red-50 border border-red-200 rounded-xl p-4 overflow-auto max-h-60">
                <p className="text-sm font-mono text-red-700 break-words">
                  {this.state.error.message}
                </p>
                {this.state.componentStack && (
                  <pre className="mt-3 text-xs text-red-600 whitespace-pre-wrap break-words">
                    {this.state.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Załaduj ponownie
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
