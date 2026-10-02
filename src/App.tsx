import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, Suspense, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MotionDatasetEffect } from "./components/motion/MotionDatasetEffect";
import { LowBatteryPrompt } from "./components/session/banners/LowBatteryPrompt";
import { LocationPermissionPrompt } from "./components/session/status/LocationPermissionPrompt";
import { AnalyticsConsentBanner } from "./components/ui/banners/AnalyticsConsentBanner";
import { AppUpdateBanner } from "./components/ui/banners/AppUpdateBanner";
import { AppUpdateProvider } from "./components/ui/banners/AppUpdateProvider";
import { PwaInstallTipBanner } from "./components/ui/banners/PwaInstallTipBanner";
import { AppCheckProbeGate } from "./components/ui/feedback/AppCheckProbeGate";
import { AppErrorBoundary } from "./components/ui/feedback/AppErrorBoundary";
import { AppErrorPage } from "./components/ui/feedback/AppErrorPage";
import { ClientMinVersionGate } from "./components/ui/feedback/ClientMinVersionGate";
import { MapErrorBoundary } from "./components/ui/feedback/MapErrorBoundary";
import { AppEntryBackdrop } from "./components/ui/layout/AppEntryBackdrop";
import { PlayerPhoneShell } from "./components/ui/layout/PlayerPhoneShell";
import { AppUiProvider } from "./components/ui/providers/AppUiProvider";
import { removeBootSplash } from "./domain/device/chrome/bootSplash";
import { markPlayDay, PWA_MARK_APP_READY } from "./domain/device/perf/playDayMarks";
import { scheduleIdleBootWork } from "./domain/device/perf/scheduleAfterFirstPaint";
import {
  CHUNK_RELOAD_CLEAR_MS,
  clearBootReloadFlag,
  clearChunkReloadFlag,
  tryApplyDeferredChunkReload,
} from "./domain/device/updates/chunkLoadRecovery";
import {
  getServiceWorkerChunkReloadContext,
  lazyWithChunkRetry,
  setChunkReloadContextGetter,
} from "./domain/device/updates/lazyWithChunkRetry";
import { notifyAppNeedRefresh } from "./domain/device/updates/serviceWorkerRefresh";
import { useEdgeSwipeBack } from "./hooks/navigation/useEdgeSwipeBack";
import { useRouteSeo } from "./hooks/navigation/useRouteSeo";
import { appQueryClient } from "./lib/queryClient";
import { AppGlobalActivity } from "./navigation/AppGlobalActivity";
import { RouteProgressChrome } from "./navigation/RouteProgressChrome";
import { RouteReadinessSensor } from "./navigation/RouteReadinessSensor";
import { RouteTransitionProvider } from "./navigation/RouteTransitionContext";
import {
  AdminOpsDeskLazy,
  AdminPreloadRequestInboxLazy,
  AppResumeWatchdogLazy,
  CreateSessionLazy,
  FeedbackLazy,
  FriendsLazy,
  GamePresetEditorLazy,
  GamePresetListLazy,
  JoinSessionLazy,
  LeaderboardLazy,
  MapScreenLazy,
  NotFoundLazy,
  PremiumLazy,
  PrivacyLazy,
  StatsLazy,
  TermsLazy,
} from "./navigation/routePreloaders";
import { Home } from "./routes/Home";
import { setTransactionNameLazy, trackPageViewLazy } from "./services/core/analytics/lazyTelemetry";
import { useSessionStore } from "./state/sessionStore";

const StatusDockGalleryLazy = import.meta.env.DEV
  ? lazyWithChunkRetry(() =>
      import("./routes/dev/StatusDockGallery").then((m) => ({
        default: m.StatusDockGallery,
      })),
    )
  : null;

const ChatLogGalleryLazy = import.meta.env.DEV
  ? lazyWithChunkRetry(() =>
      import("./routes/dev/ChatLogGallery").then((m) => ({
        default: m.ChatLogGallery,
      })),
    )
  : null;

const DevScenariosLazy = lazyWithChunkRetry(() =>
  import("./routes/DevScenarios").then((m) => ({
    default: m.DevScenarios,
  })),
);

function RouteFallback() {
  return (
    <div
      className="route-fallback-skeleton route-loading-enter"
      aria-busy="true"
      role="status"
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
    trackPageViewLazy(path);
    setTransactionNameLazy(location.pathname);
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

function PlayerPhoneShellOutlet() {
  return (
    <PlayerPhoneShell>
      <Outlet />
    </PlayerPhoneShell>
  );
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
    let cancelled = false;
    const cancelIdle = scheduleIdleBootWork(() => {
      void import("./services/session/sessionCleanup")
        .then(({ pruneStaleTimerSessions }) => {
          if (!cancelled) {
            pruneStaleTimerSessions();
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
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
    <QueryClientProvider client={appQueryClient}>
      <AppUiProvider>
        <BrowserRouter>
          <RouteTransitionProvider>
            <AppUpdateProvider>
              <AppErrorBoundary fallback={<AppErrorFallback />}>
                <AppCheckProbeGate>
                  {/* Outside min-version gate so waiting SW chip stays visible when blocked. */}
                  <AppUpdateBanner />
                  <ClientMinVersionGate>
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
                    <PwaInstallTipBanner />
                    <AnalyticsConsentBanner />
                    <AppEntryBackdrop />
                    <div className="jl-scroll app-scroll-root">
                      <LowBatteryPrompt />
                      <LocationPermissionPrompt />
                      <Routes>
                        <Route element={<PlayerPhoneShellOutlet />}>
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
                          <Route
                            path="/join"
                            element={
                              <LazyRoute>
                                <JoinSessionLazy />
                              </LazyRoute>
                            }
                          />
                          {StatusDockGalleryLazy ? (
                            <Route
                              path="/dev/status-dock"
                              element={
                                <LazyRoute>
                                  <StatusDockGalleryLazy />
                                </LazyRoute>
                              }
                            />
                          ) : null}
                          {ChatLogGalleryLazy ? (
                            <Route
                              path="/dev/chat-log"
                              element={
                                <LazyRoute>
                                  <ChatLogGalleryLazy />
                                </LazyRoute>
                              }
                            />
                          ) : null}
                          <Route
                            path="/dev/scenarios"
                            element={
                              <LazyRoute>
                                <DevScenariosLazy />
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
                        </Route>
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
                          path="/admin/preload-requests"
                          element={
                            <LazyRoute>
                              <AdminPreloadRequestInboxLazy />
                            </LazyRoute>
                          }
                        />
                      </Routes>
                    </div>
                  </ClientMinVersionGate>
                </AppCheckProbeGate>
              </AppErrorBoundary>
            </AppUpdateProvider>
          </RouteTransitionProvider>
        </BrowserRouter>
      </AppUiProvider>
    </QueryClientProvider>
  );
}
