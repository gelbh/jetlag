import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMonitorLayout } from "../../domain/admin/opsDeskLayout";
import { createTestSession } from "../../test/fixtures/sessions";
import { AdminMonitorPane } from "./AdminMonitorPane";

vi.mock("../../hooks/admin/useAdminMapWideLayout", () => ({
  useAdminMapWideLayout: vi.fn(() => false),
}));

vi.mock("../../routes/AdminMapScreen", () => ({
  AdminMapScreen: () => <div data-testid="admin-map-screen-embed">map embed</div>,
}));

vi.mock("./AdminMonitorGridWorkspace", () => ({
  AdminMonitorGridWorkspace: () => <div data-testid="admin-monitor-grid">nested grid</div>,
}));

vi.mock("../../routes/observer-map-screen/useObserverMapScreen", () => ({
  useObserverMapScreen: vi.fn(),
}));

vi.mock("../../hooks/session/useSessionExtrasSync", () => ({
  usePlayerLocationsSync: vi.fn(() => []),
}));

import { useAdminMapWideLayout } from "../../hooks/admin/useAdminMapWideLayout";
import { useObserverMapScreen } from "../../routes/observer-map-screen/useObserverMapScreen";

const mockedUseAdminMapWideLayout = vi.mocked(useAdminMapWideLayout);
const mockedUseObserverMapScreen = vi.mocked(useObserverMapScreen);

function mockController() {
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
    layerVisibility: {},
    spectatorLayers: { chatDisplayRole: "admin" as const },
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
    timer: { timerState: { accumulatedMs: 0, runningSince: null } },
    overlay: {},
    mapViewport: null,
    setMapViewport: vi.fn(),
    activeThermometerWalk: null,
    lowPowerMode: false,
    distanceUnit: "metric" as const,
    exitPath: "/admin",
  };
}

describe("AdminMonitorPane", () => {
  beforeEach(() => {
    mockedUseObserverMapScreen.mockReturnValue(
      mockController() as unknown as ReturnType<typeof useObserverMapScreen>,
    );
    mockedUseAdminMapWideLayout.mockReturnValue(false);
  });

  it("shows viewport-neutral idle copy without on-desktop wording", () => {
    render(<AdminMonitorPane active={false} />);

    expect(screen.getByText("Monitor pane")).toBeInTheDocument();
    expect(screen.getByText("Select a live session to watch the map here.")).toBeInTheDocument();
    expect(screen.queryByText(/on desktop/i)).not.toBeInTheDocument();
  });

  it("shows sessions unavailable idle copy when the sessions list failed", () => {
    render(<AdminMonitorPane active={false} sessionsUnavailable />);

    expect(
      screen.getByText("Sessions unavailable. Retry from the Sessions panel."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select a live session to watch the map here."),
    ).not.toBeInTheDocument();
  });

  it("uses compact embed path without nested grid when container is narrow", () => {
    render(
      <AdminMonitorPane
        active
        sessionCode="ABCD"
        monitorLayout={defaultMonitorLayout()}
        onMonitorLayoutChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("admin-monitor-compact")).toBeInTheDocument();
    expect(screen.getByTestId("admin-map-screen-embed")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-monitor-grid")).not.toBeInTheDocument();
  });

  it("renders nested monitor grid when wide and layout handler is provided", () => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    render(
      <AdminMonitorPane
        active
        sessionCode="ABCD"
        monitorLayout={defaultMonitorLayout()}
        onMonitorLayoutChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("admin-monitor-nested-wm")).toBeInTheDocument();
    expect(screen.getByTestId("admin-monitor-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-map-screen-embed")).not.toBeInTheDocument();
  });
});
