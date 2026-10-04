import { Component, type ErrorInfo, type ReactNode } from "react";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import {
  clearChunkReloadFlag,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
  wasChunkReloadDeferred,
} from "@/domain/device/updates/chunkLoadRecovery";
import { captureErrorBoundaryExceptionLazy } from "@/services/core/analytics/lazyTelemetry";
import { AppErrorPage } from "./AppErrorPage";

interface MapErrorBoundaryProps {
  children: ReactNode;
}

interface MapErrorBoundaryState {
  error: Error | null;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureErrorBoundaryExceptionLazy(error, info.componentStack);
    console.error("Map screen crashed:", error, info.componentStack);
  }

  private handleReload = (): void => {
    clearChunkReloadFlag();
    this.setState({ error: null });
    window.location.reload();
  };

  private errorMessage(): string {
    const { error } = this.state;
    if (!error) {
      return "The map crashed.";
    }

    if (isChunkLoadError(error) && wasChunkReloadDeferred()) {
      return appUpdateCopy.chunkDeferredBody;
    }

    if (isChunkLoadError(error) && hasChunkReloadBeenAttempted()) {
      return appUpdateCopy.chunkReadyBody;
    }

    return error.message || "The map crashed.";
  }

  private showReloadAction(): boolean {
    const { error } = this.state;
    if (!error) {
      return true;
    }

    return !isChunkLoadError(error) || !wasChunkReloadDeferred();
  }

  render(): ReactNode {
    if (this.state.error) {
      const deferredChunk = isChunkLoadError(this.state.error) && wasChunkReloadDeferred();

      return (
        <AppErrorPage
          title={deferredChunk ? appUpdateCopy.deferredTitle : appUpdateCopy.mapErrorTitle}
          message={deferredChunk ? appUpdateCopy.chunkDeferredBody : this.errorMessage()}
          assertive
          primaryAction={
            this.showReloadAction()
              ? {
                  label: appUpdateCopy.mapErrorReload,
                  onClick: this.handleReload,
                }
              : null
          }
          secondaryAction={{
            label: appUpdateCopy.mapErrorBackHome,
            to: "/",
          }}
        />
      );
    }

    return this.props.children;
  }
}
