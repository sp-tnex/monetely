import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 transition-colors duration-200">
          <div className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl p-8 overflow-hidden text-center flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="p-4 bg-destructive/10 text-destructive rounded-full border border-destructive/20 mb-5">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Something went wrong
            </h1>
            
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              An unexpected error occurred while rendering this view. Don't worry, your balances and transactions are safe.
            </p>

            {this.state.error && (
              <div className="w-full mt-6 p-4 rounded-lg bg-secondary/30 border border-border text-left overflow-x-auto max-h-36">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Error Details
                </span>
                <code className="text-xs font-mono text-destructive font-medium block mt-1.5 break-all">
                  {this.state.error.name}: {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-8">
              <Button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 font-semibold"
              >
                <RefreshCw size={16} />
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 font-semibold"
              >
                <Home size={16} />
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
