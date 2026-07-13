import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppLink } from "../navigation/AppLink";
import {
  clearChunkReloadFlag,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
  wasChunkReloadDeferred,
} from "../../domain/device/chunkLoadRecovery";
import { appUpdateCopy } from "../../domain/device/appUpdateCopy";
import { captureException } from "../../services/core/sentry";
import { MapFloatAlertPanel } from "./MapFloatAlert";

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
    captureException(error);
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
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold text-ink">
            {appUpdateCopy.mapErrorTitle}
          </h1>
          {deferredChunk ? (
            <p className="max-w-md text-sm text-ink-dim">
              {appUpdateCopy.deferredTitle} — {appUpdateCopy.chunkDeferredBody}
            </p>
          ) : (
            <MapFloatAlertPanel className="mx-auto max-w-md border-highlight/55 bg-surface-deep normal-case tracking-normal">
              <p className="min-w-0 text-left text-sm text-ink">
                {this.errorMessage()}
              </p>
              {this.showReloadAction() ? (
                <button
                  type="button"
                  className="btn-primary min-h-11 shrink-0 px-4 text-xs"
                  onClick={this.handleReload}
                >
                  {appUpdateCopy.mapErrorReload}
                </button>
              ) : null}
            </MapFloatAlertPanel>
          )}
          <AppLink
            to="/"
            className="btn-secondary border border-border px-4 py-2 text-sm"
          >
            {appUpdateCopy.mapErrorBackHome}
          </AppLink>
        </div>
      );
    }

    return this.props.children;
  }
}
