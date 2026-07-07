import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
import { LowBatteryPrompt } from "./components/session/LowBatteryPrompt";
import { useMotionProfile } from "./hooks/location/useMotionProfile";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";
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
    <div className="route-loading-enter flex min-h-full items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-ink-dim">
      Loading…
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
  useMotionProfile();

  useEffect(() => {
    pruneStaleTimerSessions();
  }, []);

  return (
    <BrowserRouter>
      <div className="h-full overflow-y-auto overscroll-y-none">
        <LowBatteryPrompt />
        <Routes>
          <Route path="/" element={<Home />} />
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
