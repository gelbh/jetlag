import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MapErrorBoundary } from "./components/ui/MapErrorBoundary";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";

const MapScreen = lazy(() =>
  import("./routes/MapScreen").then((m) => ({ default: m.MapScreen })),
);
const CreateSession = lazy(() =>
  import("./routes/CreateSession").then((m) => ({ default: m.CreateSession })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center text-ink-dim">
      Loading…
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
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
