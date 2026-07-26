import { Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { trackPageView } from "./services/core/analytics";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
import { AppEntryBackdrop } from "./components/ui/AppEntryBackdrop";
import { AnalyticsConsentBanner } from "./components/ui/AnalyticsConsentBanner";
import { AppUpdateBanner } from "./components/ui/AppUpdateBanner";
import { AppUpdateProvider } from "./components/ui/AppUpdateProvider";
import { LowBatteryPrompt } from "./components/session/LowBatteryPrompt";
import { MotionDatasetEffect } from "./components/motion/MotionDatasetEffect";
import { AppErrorPage } from "./components/ui/AppErrorPage";
import { Home } from "./routes/Home";
import { AdminPanel } from "./routes/AdminPanel";
import { AdminIncidentDesk } from "./components/admin/AdminIncidentDesk";
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
} from "./domain/device/chunkLoadRecovery";
import {
  getServiceWorkerChunkReloadContext,
  setChunkReloadContextGetter,
} from "./domain/device/lazyWithChunkRetry";
import { removeBootSplash } from "./domain/device/bootSplash";
import { notifyAppNeedRefresh } from "./domain/device/serviceWorkerRefresh";
import { useEdgeSwipeBack } from "./hooks/useEdgeSwipeBack";
import { useRouteSeo } from "./hooks/useRouteSeo";
import { pruneStaleTimerSessions } from "./services/session/sessionCleanup";
import { useSessionStore } from "./state/sessionStore";
import { RouteReadinessSensor } from "./navigation/RouteReadinessSensor";
import { RouteTransitionOverlay } from "./navigation/RouteTransitionOverlay";
import { RouteTransitionProvider } from "./navigation/RouteTransitionContext";
import {
  CreateSessionLazy,
  FriendsLazy,
  GamePresetEditorLazy,
  GamePresetListLazy,
  LeaderboardLazy,
  MapScreenLazy,
  StatsLazy,
  TutorialLazy,
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
            <MotionDatasetEffect />
            <RouteTransitionOverlay />
            <RouteReadinessSensor />
            <EdgeSwipeBackBinder />
            <AnalyticsPageViewTracker />
            <RouteSeoTracker />
            <ChunkReloadContextBinder />
            <AppUpdateBanner />
            <AnalyticsConsentBanner />
            <AppEntryBackdrop />
            <div className="app-scroll-root">
              <LowBatteryPrompt />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/tutorial"
                  element={
                    <LazyRoute>
                      <TutorialLazy />
                    </LazyRoute>
                  }
                />
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
                <Route path="/admin" element={<AdminPanel />} />
                <Route
                  path="/admin/incidents"
                  element={<AdminIncidentDesk />}
                />
                <Route
                  path="/admin/incidents/:incidentId"
                  element={<AdminIncidentDesk />}
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Sentry.ErrorBoundary>
        </AppUpdateProvider>
      </RouteTransitionProvider>
    </BrowserRouter>
  );
}
