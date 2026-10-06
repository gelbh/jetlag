import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import { type ComponentType, type ReactNode, StrictMode } from "react";
import { createRoot, type ErrorInfo, hydrateRoot } from "react-dom/client";
import { markEmbedShellAttribute } from "./domain/device/embed/embedMode";
import { markPlayDay, PWA_MARK_NAV } from "./domain/device/perf/playDayMarks.ts";
import { isPublicShellPath } from "./domain/device/perf/publicShellPaths.ts";
import { countRecoverableError } from "./domain/device/perf/recoverableErrors.ts";
import { scheduleAfterFirstPaint } from "./domain/device/perf/scheduleAfterFirstPaint.ts";
import { scheduleWhenIdleAfterLoad } from "./domain/device/perf/scheduleWhenIdleAfterLoad.ts";
import { markStandaloneShellClass } from "./domain/device/pwa/markStandaloneShellClass";
import { installPreloadErrorRecovery } from "./domain/device/updates/preloadErrorRecovery.ts";
import { unregisterDevServiceWorkers } from "./domain/device/updates/unregisterDevServiceWorkers.ts";
import "./theme/mantineShellStyles";
import "./index.css";

// deviceOffline pulls the session store; keep it out of the entry chunk. Until it loads, the
// gate falls back to the browser's online flag.
let isDeviceOffline: (() => boolean) | undefined;
scheduleWhenIdleAfterLoad(() => {
  void import("./services/core/network/deviceOffline.ts")
    .then((module) => {
      isDeviceOffline = module.isDeviceEffectivelyOffline;
    })
    .catch(() => {});
});
installPreloadErrorRecovery({
  isOffline: () => isDeviceOffline?.() ?? (typeof navigator !== "undefined" && !navigator.onLine),
});
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
    void import("./services/core/analytics/analytics.ts").then(
      ({ initPosthogCore, initAnalytics }) => {
        initPosthogCore();
        initAnalytics();
      },
    );
  });
}

/** Hydration mismatch: React already re-rendered on the client, so only leave a trace. */
function onRecoverableError(error: unknown, errorInfo: ErrorInfo): void {
  countRecoverableError();
  if (import.meta.env.DEV) {
    console.error("Recoverable React error", error, errorInfo.componentStack);
  }
  void import("./services/core/analytics/lazyTelemetry.ts")
    .then(({ addRecoverableErrorBreadcrumbLazy }) => {
      addRecoverableErrorBreadcrumbLazy(error, errorInfo.componentStack);
    })
    .catch(() => {});
}

function appTree(App: ComponentType): ReactNode {
  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

function renderApp(): Promise<void> {
  markPlayDay(PWA_MARK_NAV);
  const rootEl = document.getElementById("root")!;
  // scripts/prerender-marketing.mjs marks real-HTML shells; hydrating keeps that first paint
  // (and its LCP element) instead of replacing it. The SPA shell has no marker.
  if (rootEl.dataset.prerendered !== "true") {
    return import("./App.tsx").then(({ default: App }) => {
      createRoot(rootEl).render(appTree(App));
    });
  }
  // A lazy route still loading when hydration starts stays dehydrated, and the first ancestor
  // re-render then client-renders it, discarding the prerendered DOM. Load it alongside App;
  // a failed load hydrates anyway and the lazy route's own chunk retry takes over.
  const routeReady = import("./navigation/routePreloaders.ts")
    .then(({ preloadLazyRouteComponent }) => preloadLazyRouteComponent(window.location.pathname))
    .catch(() => {});
  return Promise.all([import("./App.tsx"), routeReady]).then(([{ default: App }]) => {
    hydrateRoot(rootEl, appTree(App), { onRecoverableError });
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
