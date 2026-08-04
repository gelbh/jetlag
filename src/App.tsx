import { Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { trackPageView } from "./services/core/analytics/analytics";
import { MapErrorBoundary } from "./components/ui/feedback/MapErrorBoundary";
import { AppEntryBackdrop } from "./components/ui/layout/AppEntryBackdrop";
import { AnalyticsConsentBanner } from "./components/ui/banners/AnalyticsConsentBanner";
import { AppUpdateBanner } from "./components/ui/banners/AppUpdateBanner";
import { PwaInstallTipBanner } from "./components/ui/banners/PwaInstallTipBanner";
import { AppUpdateProvider } from "./components/ui/banners/AppUpdateProvider";
import { LowBatteryPrompt } from "./components/session/banners/LowBatteryPrompt";
import { LocationPermissionPrompt } from "./components/session/status/LocationPermissionPrompt";
import { MotionDatasetEffect } from "./components/motion/MotionDatasetEffect";
import { AppCheckProbeGate } from "./components/ui/feedback/AppCheckProbeGate";
import { AppErrorPage } from "./components/ui/feedback/AppErrorPage";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";
import { scheduleIdleBootWork } from "./domain/device/perf/scheduleAfterFirstPaint";
import {
  CHUNK_RELOAD_CLEAR_MS,
  clearBootReloadFlag,
  clearChunkReloadFlag,
  tryApplyDeferredChunkReload,
} from "./domain/device/updates/chunkLoadRecovery";
import {
  getServiceWorkerChunkReloadContext,
  setChunkReloadContextGetter,
} from "./domain/device/updates/lazyWithChunkRetry";
import { removeBootSplash } from "./domain/device/chrome/bootSplash";
import {
  PWA_MARK_APP_READY,
  markPlayDay,
} from "./domain/device/perf/playDayMarks";
import { notifyAppNeedRefresh } from "./domain/device/updates/serviceWorkerRefresh";
import { useEdgeSwipeBack } from "./hooks/navigation/useEdgeSwipeBack";
import { useRouteSeo } from "./hooks/navigation/useRouteSeo";
import { pruneStaleTimerSessions } from "./services/session/sessionCleanup";
import { useSessionStore } from "./state/sessionStore";
import { RouteReadinessSensor } from "./navigation/RouteReadinessSensor";
import { RouteProgressChrome } from "./navigation/RouteProgressChrome";
import { AppGlobalActivity } from "./navigation/AppGlobalActivity";
import { RouteTransitionProvider } from "./navigation/RouteTransitionContext";
import {
  AdminOpsDeskLazy,
  AppResumeWatchdogLazy,
  CreateSessionLazy,
  FeedbackLazy,
  FriendsLazy,
  GamePresetEditorLazy,
  GamePresetListLazy,
  LeaderboardLazy,
  MapScreenLazy,
  NotFoundLazy,
  PremiumLazy,
  PrivacyLazy,
  StatsLazy,
  TermsLazy,
} from "./navigation/routePreloaders";

function RouteFallback() {
  return (
    <div
      className="route-fallback-skeleton route-loading-enter"
      aria-busy="true"
      aria-label="Loading map"
    >
      <div className="route-fallback-status" />
      <div className="route-fallback-map" />
      <div className="route-fallback-dock" />
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function LazyRouteQuiet({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function AnalyticsPageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPageView(path);
    Sentry.getCurrentScope().setTransactionName(location.pathname);
  }, [location]);

  return null;
}

function RouteSeoTracker() {
  useRouteSeo();
  return null;
}

function EdgeSwipeBackBinder() {
  useEdgeSwipeBack();
  return null;
}

function ChunkReloadContextBinder() {
  const session = useSessionStore((state) => state.session);
  const location = useLocation();

  useEffect(() => {
    setChunkReloadContextGetter(() => ({
      session,
      pathname: location.pathname,
      onNeedRefresh: notifyAppNeedRefresh,
      ...getServiceWorkerChunkReloadContext(),
    }));

    tryApplyDeferredChunkReload({
      session,
      pathname: location.pathname,
      onNeedRefresh: notifyAppNeedRefresh,
      ...getServiceWorkerChunkReloadContext(),
    });

    return () => {
      setChunkReloadContextGetter(undefined);
    };
  }, [location.pathname, session]);

  return null;
}

function AppErrorFallback() {
  return (
    <AppErrorPage
      title="Something went wrong"
      message="The app hit an unexpected error."
      assertive
      primaryAction={{
        label: "Reload",
        onClick: () => window.location.reload(),
      }}
      secondaryAction={{ label: "Back home", to: "/" }}
    />
  );
}

export default function App() {
  useLayoutEffect(() => {
    removeBootSplash();
    markPlayDay(PWA_MARK_APP_READY);
  }, []);

  useEffect(() => {
    return scheduleIdleBootWork(() => {
      pruneStaleTimerSessions();
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      clearChunkReloadFlag();
      clearBootReloadFlag();
    }, CHUNK_RELOAD_CLEAR_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <BrowserRouter>
      <RouteTransitionProvider>
        <AppUpdateProvider>
          <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
            <AppCheckProbeGate>
              <MotionDatasetEffect />
            <RouteProgressChrome />
            <AppGlobalActivity />
            <RouteReadinessSensor />
            <EdgeSwipeBackBinder />
            <AnalyticsPageViewTracker />
            <RouteSeoTracker />
            <ChunkReloadContextBinder />
            <LazyRouteQuiet>
              <AppResumeWatchdogLazy />
            </LazyRouteQuiet>
            <AppUpdateBanner />
            <PwaInstallTipBanner />
            <AnalyticsConsentBanner />
            <AppEntryBackdrop />
            <div className="jl-scroll app-scroll-root">
              <LowBatteryPrompt />
              <LocationPermissionPrompt />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/feedback"
                  element={
                    <LazyRoute>
                      <FeedbackLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/stats"
                  element={
                    <LazyRoute>
                      <StatsLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/friends"
                  element={
                    <LazyRoute>
                      <FriendsLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <LazyRoute>
                      <LeaderboardLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/privacy"
                  element={
                    <LazyRoute>
                      <PrivacyLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <LazyRoute>
                      <TermsLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/premium"
                  element={
                    <LazyRoute>
                      <PremiumLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <LazyRoute>
                      <CreateSessionLazy />
                    </LazyRoute>
                  }
                />
                <Route path="/join" element={<JoinSession />} />
                <Route
                  path="/admin"
                  element={
                    <LazyRoute>
                      <AdminOpsDeskLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/admin/incidents"
                  element={
                    <LazyRoute>
                      <AdminOpsDeskLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/admin/incidents/:incidentId"
                  element={
                    <LazyRoute>
                      <AdminOpsDeskLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/presets"
                  element={
                    <LazyRoute>
                      <GamePresetListLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/presets/new"
                  element={
                    <LazyRoute>
                      <GamePresetEditorLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/presets/:id/edit"
                  element={
                    <LazyRoute>
                      <GamePresetEditorLazy />
                    </LazyRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <LazyRoute>
                      <MapErrorBoundary>
                        <MapScreenLazy />
                      </MapErrorBoundary>
                    </LazyRoute>
                  }
                />
                <Route path="/tutorial" element={<Navigate to="/" replace />} />
                <Route
                  path="*"
                  element={
                    <LazyRoute>
                      <NotFoundLazy />
                    </LazyRoute>
                  }
                />
              </Routes>
            </div>
            </AppCheckProbeGate>
          </Sentry.ErrorBoundary>
        </AppUpdateProvider>
      </RouteTransitionProvider>
    </BrowserRouter>
  );
}
