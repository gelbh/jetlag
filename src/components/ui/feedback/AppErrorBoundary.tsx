import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureErrorBoundaryExceptionLazy } from "@/services/core/analytics/lazyTelemetry";

interface AppErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Root error boundary. Replaces `Sentry.ErrorBoundary` so `@sentry/react`
 * stays off the App chunk's static graph; capture goes through the lazy facade.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureErrorBoundaryExceptionLazy(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
