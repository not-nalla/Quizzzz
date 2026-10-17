import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("SyllabusIQ UI error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
            </div>

            <div className="space-y-2">
              <h1 className="text-h2 font-display font-bold">
                Something went wrong
              </h1>
              <p className="text-body text-muted-foreground leading-relaxed">
                The interface hit an unexpected error. Your saved answers are
                unaffected.
              </p>
              {this.state.errorMessage && (
                <p className="font-mono text-code text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button size="sm" className="h-9 gap-1.5" onClick={this.handleReset}>
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => window.location.assign("/dashboard")}
              >
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
