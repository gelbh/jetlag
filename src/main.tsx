import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import { type ErrorInfo, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { markEmbedShellAttribute } from "./domain/device/embed/embedMode";
import { markPlayDay, PWA_MARK_NAV } from "./domain/device/perf/playDayMarks.ts";
import { countRecoverableError } from "./domain/device/perf/recoverableErrors.ts";
import { isPublicShellPath } from "./domain/device/perf/publicShellPaths.ts";
import { scheduleAfterFirstPaint } from "./domain/device/perf/scheduleAfterFirstPaint.ts";
import { scheduleWhenIdleAfterLoad } from "./domain/device/perf/scheduleWhenIdleAfterLoad.ts";
import { markStandaloneShellClass } from "./domain/device/pwa/markStandaloneShellClass";
import { unregisterDevServiceWorkers } from "./domain/device/updates/unregisterDevServiceWorkers.ts";
import "./theme/mantineShellStyles";
import "./index.css";

markStandaloneShellClass();
markEmbedShellAttribute();
// Gate here (not only inside the bridge) so production never fetches the
// bridge chunk, which pulls Firebase into the boot path.
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  void import("./test/e2eBridge")
    .then((m) => m.installE2EBridgeIfConfigured())
    .catch((error: unknown) => {
      console.error("E2E bridge failed to load", error);
    });
}
function scheduleDeferredObservability(): void {
  scheduleAfterFirstPaint(() => {
    void import("./services/core/analytics/sentry.ts").then(({ initSentry, setBootstrapTag }) => {
      setBootstrapTag("render");
      initSentry();
    });
    void import("./services/core/analytics/analytics.ts").then(({ initAnalytics }) => {
      initAnalytics();
    });
  });
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  // Hydration errors wrap the concrete mismatch in `cause`.
  return error.cause instanceof Error
    ? `${error.message} (cause: ${error.cause.message})`
    : error.message;
}

/** Hydration mismatch: React already re-rendered on the client, so only leave a trace. */
function onRecoverableError(error: unknown, errorInfo: ErrorInfo): void {
  countRecoverableError();
  if (import.meta.env.DEV) {
    console.error("Recoverable React error", error, errorInfo.componentStack);
  }
  void import("./services/core/analytics/lazyTelemetry.ts")
    .then(({ addRecoverableErrorBreadcrumbLazy }) => {
      addRecoverableErrorBreadcrumbLazy({
        message: errorMessage(error),
        componentStack: errorInfo.componentStack,
        pathname: window.location.pathname,
      });
    })
    .catch(() => {});
}

function renderApp(): Promise<void> {
  markPlayDay(PWA_MARK_NAV);
  return import("./App.tsx").then(({ default: App }) => {
    const rootEl = document.getElementById("root")!;
    const tree = (
      <StrictMode>
        <App />
      </StrictMode>
    );
    // scripts/prerender-marketing.mjs marks real-HTML shells; hydrating keeps that first paint
    // (and its LCP element) instead of replacing it. The SPA shell has no marker.
    if (rootEl.dataset.prerendered === "true") {
      hydrateRoot(rootEl, tree, { onRecoverableError });
      return;
    }
    createRoot(rootEl).render(tree);
  });
}

function startDeferredAuthBootstrap(appRendered: Promise<void>): void {
  const start = () => {
    void import("./services/core/firebase/firebase.ts").then(
      ({ isFirebaseConfigured, startAuthBootstrap }) => {
        if (isFirebaseConfigured()) {
          startAuthBootstrap();
        }
      },
    );
  };

  // Public shells need no auth to render; starting Firebase Auth there pulls
  // the gapi iframe + App Check reCAPTCHA onto the LCP path, so wait for the
  // first App paint, `load`, and idle. First-need callers (ensureAnonymousUser,
  // waitForAuthStateReady) still start it early.
  if (isPublicShellPath(window.location.pathname)) {
    void appRendered
      .catch(() => {})
      .finally(() => {
        scheduleAfterFirstPaint(() => {
          scheduleWhenIdleAfterLoad(start);
        });
      });
    return;
  }
  start();
}

void unregisterDevServiceWorkers().then((cleared) => {
  if (cleared) {
    window.location.reload();
    return;
  }

  startDeferredAuthBootstrap(renderApp());
  scheduleDeferredObservability();
});
