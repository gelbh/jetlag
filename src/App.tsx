import { lazy, Suspense, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { trackPageView } from "./services/core/analytics";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
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

export default function App() {
  useMotionProfile();

  useEffect(() => {
    pruneStaleTimerSessions();
  }, []);

  return (
    <BrowserRouter>
      <AnalyticsPageViewTracker />
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
  );
}
