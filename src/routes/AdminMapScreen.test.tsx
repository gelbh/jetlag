import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AdminMapScreen } from "./AdminMapScreen";
import { createTestSession } from "../test/fixtures/sessions";
import { renderWithRouter } from "../test/renderWithRouter";

vi.mock("../hooks/admin/useAdminMapWideLayout", () => ({
  useAdminMapWideLayout: vi.fn(() => false),
}));

vi.mock("./observer-map-screen/useObserverMapScreen", () => ({
  useObserverMapScreen: vi.fn(),
}));

vi.mock("../components/map/chrome/MapView", () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="admin-map-view">{children}</div>
  ),
}));

vi.mock("../components/map/chrome/MapViewportTracker", () => ({
  MapViewportTracker: () => null,
}));

vi.mock("../components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("./spectator-map/SpectatorMapLayers", () => ({
  SpectatorMapLayers: () => null,
}));

import { useAdminMapWideLayout } from "../hooks/admin/useAdminMapWideLayout";
import {
  useObserverMapScreen,
  type ObserverMapScreenController,
} from "./observer-map-screen/useObserverMapScreen";

const mockedUseAdminMapWideLayout = vi.mocked(useAdminMapWideLayout);
const mockedUseObserverMapScreen = vi.mocked(useObserverMapScreen);

function mockController(): ObserverMapScreenController {
  const session = createTestSession();
  return {
    session,
    myRole: "admin" as const,
    uid: "admin-uid",
    sessionId: session.id,
    sessionRules: session,
    gameArea: session.gameArea,
    playAreaReady: true,
    center: [51.505, -0.09] as [number, number],
    mapFocusBounds: null,
    mapStyle: "standard" as const,
    handleMapStyleChange: vi.fn(),
    effectiveBasemapStyle: "standard" as const,
    layerVisibility: {
      radar: true,
      thermometer: true,
      measuring: true,
      matching: true,
      zone: true,
      pin: true,
      tentacle: true,
      transit: true,
    },
    spectatorLayers: {
      chatDisplayRole: "admin" as const,
      showSeekerPins: true,
      showHiderPins: true,
      showSeekerTrails: true,
      showHiderTrails: true,
      showZones: true,
      showAnnotations: true,
    },
    annotations: [],
    pendingQuestions: [],
    hidingZones: [],
    seekerLocations: [],
    hiderLocations: [],
    chatMessages: [],
    syncStatus: {
      status: "synced" as const,
      queuedWrites: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
    },
    authReady: true,
    timer: {
      timerState: { accumulatedMs: 0, runningSince: null },
      running: false,
      hasStarted: false,
      elapsedMs: 0,
      start: vi.fn(),
      pause: vi.fn(),
      reset: vi.fn(),
      syncFromRemote: vi.fn(),
    },
    overlay: {
      isLogOpen: false,
      isChatOpen: false,
      openLog: vi.fn(),
      openChat: vi.fn(),
      closeSheet: vi.fn(),
    },
    mapViewport: null,
    setMapViewport: vi.fn(),
    activeThermometerWalk: null,
    lowPowerMode: false,
    distanceUnit: "metric" as const,
    exitPath: "/admin",
  } as unknown as ObserverMapScreenController;
}

describe("AdminMapScreen", () => {
  beforeEach(() => {
    mockedUseObserverMapScreen.mockReturnValue(mockController());
    mockedUseAdminMapWideLayout.mockReturnValue(false);
  });

  it("keeps phone sheets and moderation overlay in compact layout", () => {
    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.getByRole("button", { name: "Open session log" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Force end" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Admin monitor rail")).not.toBeInTheDocument();
  });

  it("renders the side rail in wide layout", () => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.getByLabelText("Admin monitor rail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Force end" })).not.toBeInTheDocument();
  });

  it("opens session log and chat from compact dock actions", () => {
    const controller = mockController();
    mockedUseObserverMapScreen.mockReturnValue(controller);

    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    fireEvent.click(screen.getByRole("button", { name: "Open session log" }));
    expect(controller.overlay.openLog).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
    expect(controller.overlay.openChat).toHaveBeenCalledTimes(1);
  });

  it("closes open log or chat sheets from active dock actions", () => {
    const controller = mockController();
    controller.overlay.isLogOpen = true;
    controller.overlay.isChatOpen = true;
    mockedUseObserverMapScreen.mockReturnValue(controller);

    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    // RacMotionSheet ModalOverlay inert-hides the dock while a sheet is open.
    fireEvent.click(
      screen.getByRole("button", { name: "Open session log", hidden: true }),
    );
    expect(controller.overlay.closeSheet).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Open chat", hidden: true }),
    );
    expect(controller.overlay.closeSheet).toHaveBeenCalledTimes(2);
  });
});
