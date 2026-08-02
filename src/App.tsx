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
import { AppUpdateProvider } from "./components/ui/banners/AppUpdateProvider";
import { LowBatteryPrompt } from "./components/session/banners/LowBatteryPrompt";
import { MotionDatasetEffect } from "./components/motion/MotionDatasetEffect";
import { AppCheckProbeGate } from "./components/ui/feedback/AppCheckProbeGate";
import { AppErrorPage } from "./components/ui/feedback/AppErrorPage";
import { AppResumeWatchdog } from "./components/ui/AppResumeWatchdog";
import { Home } from "./routes/Home";
import { AdminOpsDesk } from "./components/admin/AdminOpsDesk";
import { JoinSession } from "./routes/JoinSession";
import { Feedback } from "./routes/Feedback";
import { NotFound } from "./routes/NotFound";
import { Privacy } from "./routes/Privacy";
import { Premium } from "./routes/Premium";
import { Terms } from "./routes/Terms";
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
  CreateSessionLazy,
  FriendsLazy,
  GamePresetEditorLazy,
  GamePresetListLazy,
  LeaderboardLazy,
  MapScreenLazy,
  StatsLazy,
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
  }, []);

  useEffect(() => {
    pruneStaleTimerSessions();
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
            <AppResumeWatchdog />
            <AppUpdateBanner />
            <AnalyticsConsentBanner />
            <AppEntryBackdrop />
            <div className="jl-scroll app-scroll-root">
              <LowBatteryPrompt />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/feedback" element={<Feedback />} />
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
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/premium" element={<Premium />} />
                <Route
                  path="/create"
                  element={
                    <LazyRoute>
                      <CreateSessionLazy />
                    </LazyRoute>
                  }
                />
                <Route path="/join" element={<JoinSession />} />
                <Route path="/admin" element={<AdminOpsDesk />} />
                <Route path="/admin/incidents" element={<AdminOpsDesk />} />
                <Route
                  path="/admin/incidents/:incidentId"
                  element={<AdminOpsDesk />}
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            </AppCheckProbeGate>
          </Sentry.ErrorBoundary>
        </AppUpdateProvider>
      </RouteTransitionProvider>
    </BrowserRouter>
  );
}
