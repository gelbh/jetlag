import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { MapScreen } from "./MapScreen";
import { createTestSession } from "../test/fixtures/sessions";
import { renderWithRouter } from "../test/renderWithRouter";
import { useSessionStore } from "../state/sessionStore";

vi.mock("../components/map/MapView", () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-screen-view">{children}</div>
  ),
}));

vi.mock("../components/map/MapViewportTracker", () => ({
  MapViewportTracker: () => null,
}));

vi.mock("../components/map/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("../components/map/LiveUserLocationLayer", () => ({
  LiveUserLocationLayer: () => null,
}));

vi.mock("../components/map/AnnotationLayer", () => ({
  AnnotationLayer: () => null,
}));

vi.mock("../components/map/GeometryEditLayer", () => ({
  GeometryEditLayer: () => null,
}));

vi.mock("../components/map/MapDraftLayer", () => ({
  MapDraftLayer: () => null,
}));

vi.mock("../hooks/session/useSessionSync", () => ({
  useSessionSync: () => undefined,
}));

vi.mock("../hooks/session/useSessionEndedRedirect", () => ({
  useSessionEndedRedirect: () => undefined,
}));

vi.mock("../hooks/location/useWakeLock", () => ({
  useWakeLock: () => undefined,
}));

vi.mock("../hooks/session/useSessionNotifications", () => ({
  useSessionNotifications: () => ({
    nativeSupported: false,
    notificationPreferences: {
      enabled: false,
      newQuestions: true,
      timerChanges: true,
      chatMessages: false,
      liveActivities: true,
    },
    enableNotifications: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  }),
}));

vi.mock("../hooks/sync/useLiveActivitySync", () => ({
  useLiveActivitySync: () => undefined,
}));

vi.mock("../services/geo/resolveSessionMatchingAreas", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../services/geo/resolveSessionMatchingAreas")
  >();
  return {
    ...actual,
    resolveSessionMatchingAreas: vi.fn(async () => undefined),
    resolveSessionPlayArea: vi.fn(async (session) => session.gameArea),
  };
});

vi.mock("../services/session/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
  preloadGameAreaCachesAsync: vi.fn(async () => undefined),
  gameAreaPreloadKey: () => "test-game-area",
}));

vi.mock("../services/geo/seaLevelProgressive", () => ({
  startSeaLevelBackgroundSampling: vi.fn(),
}));

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

describe("MapScreen", () => {
  it("redirects to create when no session game area exists", () => {
    useSessionStore.getState().setSession(
      createTestSession({ gameArea: undefined }),
    );

    renderWithRouter(
      <Routes>
        <Route path="/map" element={<MapScreen />} />
        <Route path="/create" element={<div>Create session landing</div>} />
      </Routes>,
      { route: "/map", resetStores: false },
    );

    expect(screen.getByText("Create session landing")).toBeInTheDocument();
  });

  it("renders the tool dock for an active session", () => {
    useSessionStore.getState().setSession(createTestSession());

    renderWithRouter(<MapScreen />, { route: "/map", resetStores: false });

    expect(screen.getByRole("button", { name: "Matching" })).toBeInTheDocument();
    expect(screen.getByTestId("map-screen-view")).toBeInTheDocument();
  });

  it("opens map settings from the tool dock", () => {
    useSessionStore.getState().setSession(createTestSession());

    renderWithRouter(<MapScreen />, { route: "/map", resetStores: false });
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });
});
