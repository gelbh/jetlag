import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";
import { pruneStaleTimerSessions } from "./services/sessionCleanup";

const MapScreen = lazy(() =>
  import("./routes/MapScreen").then((m) => ({ default: m.MapScreen })),
);
const CreateSession = lazy(() =>
  import("./routes/CreateSession").then((m) => ({ default: m.CreateSession })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-ink-dim">
      Loading…
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
  useEffect(() => {
    pruneStaleTimerSessions();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-[100dvh]">
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
