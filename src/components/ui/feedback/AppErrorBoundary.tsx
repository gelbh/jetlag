import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureErrorBoundaryExceptionLazy } from "@/services/core/analytics/lazyTelemetry";

interface AppErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary. Replaces `Sentry.ErrorBoundary` so `@sentry/react`
 * stays off the App chunk's static graph; capture goes through the lazy facade.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  // Flag, not the thrown value: a thrown `undefined`/`null` must still show the fallback.
  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureErrorBoundaryExceptionLazy(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
