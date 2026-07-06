import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface MapErrorBoundaryProps {
  children: ReactNode;
}

interface MapErrorBoundaryState {
  error: Error | null;
}

export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Map screen crashed:", error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold text-ink">Map failed to load</h1>
          <p className="max-w-md text-sm text-ink-dim">
            {this.state.error.message || "The map crashed."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={this.handleReload}
            >
              Reload map
            </button>
            <Link
              to="/"
              className="btn-secondary border border-border px-4 py-2 text-sm"
            >
              Back home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
