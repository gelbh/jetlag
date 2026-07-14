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
import { AppUpdateBanner } from "./components/ui/AppUpdateBanner";
import { AppUpdateProvider } from "./components/ui/AppUpdateProvider";
import { LowBatteryPrompt } from "./components/session/LowBatteryPrompt";
import { MotionDatasetEffect } from "./components/motion/MotionDatasetEffect";
import { AppLink } from "./components/navigation/AppLink";
import { Home } from "./routes/Home";
import { AdminPanel } from "./routes/AdminPanel";
import { JoinSession } from "./routes/JoinSession";
import { Feedback } from "./routes/Feedback";
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
import { pruneStaleTimerSessions } from "./services/session/sessionCleanup";
import { useSessionStore } from "./state/sessionStore";
import { AppNavigate } from "./navigation/AppNavigate";
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
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink-dim">
        The app hit an unexpected error.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <AppLink
          to="/"
          className="btn-secondary border border-border px-4 py-2 text-sm"
        >
          Back home
        </AppLink>
      </div>
    </div>
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
            <ChunkReloadContextBinder />
            <AppUpdateBanner />
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
                <Route path="*" element={<AppNavigate to="/" replace />} />
              </Routes>
            </div>
          </Sentry.ErrorBoundary>
        </AppUpdateProvider>
      </RouteTransitionProvider>
    </BrowserRouter>
  );
}
