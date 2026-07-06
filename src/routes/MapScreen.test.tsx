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

vi.mock("../hooks/useSessionSync", () => ({
  useSessionSync: () => undefined,
}));

vi.mock("../hooks/useSessionEndedRedirect", () => ({
  useSessionEndedRedirect: () => undefined,
}));

vi.mock("../hooks/useWakeLock", () => ({
  useWakeLock: () => undefined,
}));

vi.mock("../services/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
}));

vi.mock("../services/seaLevelProgressive", () => ({
  startSeaLevelBackgroundSampling: vi.fn(),
}));

vi.mock("../services/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

describe("MapScreen", () => {
  it("redirects to create when no session game area exists", () => {
    renderWithRouter(
      <Routes>
        <Route path="/map" element={<MapScreen />} />
        <Route path="/create" element={<div>Create session landing</div>} />
      </Routes>,
      { route: "/map" },
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
