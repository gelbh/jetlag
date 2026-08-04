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
import { installE2EBridgeIfConfigured } from "./test/e2eBridge";
import "./index.css";

installE2EBridgeIfConfigured();

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
