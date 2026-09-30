import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import { unregisterDevServiceWorkers } from "./domain/device/updates/unregisterDevServiceWorkers.ts";
import {
  scheduleAfterFirstPaint,
} from "./domain/device/perf/scheduleAfterFirstPaint.ts";
import { PWA_MARK_NAV, markPlayDay } from "./domain/device/perf/playDayMarks.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { markStandaloneShellClass } from "./domain/device/pwa/markStandaloneShellClass";
import { markEmbedShellAttribute } from "./domain/device/embed/embedMode";
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
    void import("./services/core/analytics/sentry.ts").then(
      ({ initSentry, setBootstrapTag }) => {
        setBootstrapTag("render");
        initSentry();
      },
    );
    void import("./services/core/analytics/analytics.ts").then(({ initAnalytics }) => {
      initAnalytics();
    });
  });
}

function renderApp() {
  markPlayDay(PWA_MARK_NAV);
  void import("./App.tsx").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}

function startDeferredAuthBootstrap(): void {
  void import("./services/core/firebase/firebase.ts").then(
    ({ isFirebaseConfigured, startAuthBootstrap }) => {
      if (isFirebaseConfigured()) {
        startAuthBootstrap();
      }
    },
  );
}

void unregisterDevServiceWorkers().then((cleared) => {
  if (cleared) {
    window.location.reload();
    return;
  }

  renderApp();
  startDeferredAuthBootstrap();
  scheduleDeferredObservability();
});
