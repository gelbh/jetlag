import { lazy, Suspense, useEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { trackPageView } from "./services/core/analytics";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
import { AppUpdateBanner } from "./components/ui/AppUpdateBanner";
import { LowBatteryPrompt } from "./components/session/LowBatteryPrompt";
import { useMotionProfile } from "./hooks/location/useMotionProfile";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";
import { Feedback } from "./routes/Feedback";
import { pruneStaleTimerSessions } from "./services/session/sessionCleanup";

const MapScreen = lazy(() =>
  import("./routes/MapScreen").then((m) => ({ default: m.MapScreen })),
);
const CreateSession = lazy(() =>
  import("./routes/CreateSession").then((m) => ({ default: m.CreateSession })),
);
const GamePresetList = lazy(() =>
  import("./routes/GamePresets").then((m) => ({ default: m.GamePresetList })),
);
const GamePresetEditor = lazy(() =>
  import("./routes/GamePresets").then((m) => ({ default: m.GamePresetEditor })),
);

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
    trackPageView(`${location.pathname}${location.search}`);
  }, [location]);

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
        <Link
          to="/"
          className="btn-secondary border border-border px-4 py-2 text-sm"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  useMotionProfile();

  useEffect(() => {
    pruneStaleTimerSessions();
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
      <BrowserRouter>
        <AnalyticsPageViewTracker />
        <AppUpdateBanner />
        <div className="h-full overflow-y-auto overscroll-y-none">
          <LowBatteryPrompt />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route
            path="/create"
            element={
              <LazyRoute>
                <CreateSession />
              </LazyRoute>
            }
          />
          <Route path="/join" element={<JoinSession />} />
          <Route
            path="/presets"
            element={
              <LazyRoute>
                <GamePresetList />
              </LazyRoute>
            }
          />
          <Route
            path="/presets/new"
            element={
              <LazyRoute>
                <GamePresetEditor />
              </LazyRoute>
            }
          />
          <Route
            path="/presets/:id/edit"
            element={
              <LazyRoute>
                <GamePresetEditor />
              </LazyRoute>
            }
          />
          <Route
            path="/map"
            element={
              <LazyRoute>
                <MapErrorBoundary>
                  <MapScreen />
                </MapErrorBoundary>
              </LazyRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
