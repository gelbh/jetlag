import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminModerateSession } from "../services/admin/adminModeration";
import { createTestSession } from "../test/fixtures/sessions";
import { renderWithRouter } from "../test/renderWithRouter";
import { AdminMapScreen } from "./AdminMapScreen";

vi.mock("../services/admin/adminModeration", () => ({
  adminModerateSession: vi.fn().mockResolvedValue(undefined),
}));

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

vi.mock("../components/admin/monitor/AdminMonitorPlayerFocus", () => ({
  AdminMonitorPlayerFocus: () => null,
}));

vi.mock("../hooks/session/useSessionExtrasSync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/session/useSessionExtrasSync")>()),
  usePlayerLocationsSync: vi.fn(() => []),
}));

import { useAdminMapWideLayout } from "../hooks/admin/useAdminMapWideLayout";
import { usePlayerLocationsSync } from "../hooks/session/useSessionExtrasSync";
import {
  type ObserverMapScreenController,
  useObserverMapScreen,
} from "./observer-map-screen/useObserverMapScreen";

const mockedUseAdminMapWideLayout = vi.mocked(useAdminMapWideLayout);
const mockedUseObserverMapScreen = vi.mocked(useObserverMapScreen);
const mockedUsePlayerLocationsSync = vi.mocked(usePlayerLocationsSync);

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
    vi.mocked(adminModerateSession).mockClear();
  });

  it("keeps phone sheets and moderation overlay in compact layout", () => {
    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.getByRole("button", { name: "Open session log" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Force end" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Admin monitor rail")).not.toBeInTheDocument();
  });

  it("asks before force ending from the compact overlay", async () => {
    const session = createTestSession({ id: "session-1" });
    mockedUseObserverMapScreen.mockReturnValue({
      ...mockController(),
      session,
      sessionRules: session,
    });
    renderWithRouter(<AdminMapScreen />, { route: "/map" });
    fireEvent.click(screen.getByRole("button", { name: "Force end" }));
    expect(adminModerateSession).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Start end game" }));
    await waitFor(() =>
      expect(adminModerateSession).toHaveBeenCalledWith(expect.any(String), "end"),
    );
  });

  it("reports moderation as failed when the session is local", async () => {
    renderWithRouter(<AdminMapScreen />, { route: "/map" });
    fireEvent.click(screen.getByRole("button", { name: "Force end" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start end game" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Moderation needs a live session.");
    expect(adminModerateSession).not.toHaveBeenCalled();
  });

  it("renders the side rail in wide layout", () => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.getByLabelText("Admin monitor rail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Force end" })).not.toBeInTheDocument();
  });

  it.each([
    { layout: "wide", wide: true },
    { layout: "narrow", wide: false },
  ])("embedded $layout monitor renders one roster from one location subscription", ({ wide }) => {
    const controller = mockController();
    mockedUseObserverMapScreen.mockReturnValue(controller);
    mockedUseAdminMapWideLayout.mockReturnValue(wide);
    mockedUsePlayerLocationsSync.mockClear();

    renderWithRouter(<AdminMapScreen embeddedMonitor />, {
      route: "/admin",
    });

    const rosters = screen.getAllByRole("region", { name: "Player roster" });
    expect(rosters).toHaveLength(1);
    expect(rosters[0].closest("[data-map-dock-frame]")).not.toBeNull();
    expect(mockedUsePlayerLocationsSync).toHaveBeenLastCalledWith(controller.session?.id);
    expect(screen.queryByTestId("admin-monitor-code") !== null).toBe(!wide);
  });

  it("embedded wide monitor shows the question strip and players panel, not a course header", () => {
    const controller = mockController();
    mockedUseObserverMapScreen.mockReturnValue(controller);
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    renderWithRouter(<AdminMapScreen embeddedMonitor />, {
      route: "/admin",
    });

    expect(screen.queryByRole("region", { name: "Course header" })).not.toBeInTheDocument();
    const strip = screen.getByTestId("admin-question-strip");
    expect(strip.closest("[data-map-dock-frame]")).not.toBeNull();
    expect(within(strip).getByRole("list", { name: "Leg strip" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Player roster" })).toBeInTheDocument();
    expect(screen.queryByRole("banner", { name: "Monitor status" })).not.toBeInTheDocument();
  });

  it("starts the embedded rail folded and the standalone rail open", () => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    const embedded = renderWithRouter(<AdminMapScreen embeddedMonitor />, { route: "/admin" });
    expect(screen.getByRole("button", { name: "Expand monitor rail" })).toBeInTheDocument();
    embedded.unmount();

    renderWithRouter(<AdminMapScreen />, { route: "/map" });
    expect(screen.getByRole("button", { name: "Collapse monitor rail" })).toBeInTheDocument();
  });

  it.each([true, false])("embedded map (wide=%s) keeps player map tokens", (wide) => {
    mockedUseAdminMapWideLayout.mockReturnValue(wide);

    renderWithRouter(<AdminMapScreen embeddedMonitor />, { route: "/admin" });

    expect(screen.getByTestId("admin-map-view").closest("[data-player-map]")).not.toBeNull();
  });

  it.each([
    { embedded: true, position: "absolute" },
    { embedded: false, position: "" },
  ])("wide shell is a two-column grid (embedded=$embedded)", ({ embedded, position }) => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    renderWithRouter(<AdminMapScreen embeddedMonitor={embedded} />, {
      route: embedded ? "/admin" : "/map",
    });

    const shell = screen.getByTestId("admin-map-view").closest(".map-screen-shell") as HTMLElement;
    expect(shell.style.display).toBe("grid");
    expect(shell.style.gridTemplateColumns).toMatch(/^minmax\(0, 1fr\) minmax\(0, /);
    // Embedded sits in the course region; standalone keeps the player shell's fixed frame.
    expect(shell.style.position).toBe(position);
    const mapCell = screen.getByTestId("admin-map-view").closest("[data-map-dock-frame]");
    expect((mapCell as HTMLElement).style.contain).toBe("layout");
  });

  it("standalone map has no player map token scope", () => {
    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.getByTestId("admin-map-view").closest("[data-player-map]")).toBeNull();
  });

  it.each([
    { embedded: true, inHeader: true },
    { embedded: false, inHeader: false },
  ])(
    "wide sync error sits in the course header row (embedded=$embedded)",
    ({ embedded, inHeader }) => {
      const controller = mockController();
      controller.syncStatus.lastSyncError = "Write rejected by rules";
      mockedUseObserverMapScreen.mockReturnValue(controller);
      mockedUseAdminMapWideLayout.mockReturnValue(true);

      renderWithRouter(<AdminMapScreen embeddedMonitor={embedded} />, {
        route: embedded ? "/admin" : "/map",
      });

      const error = screen.getByText("Write rejected by rules");
      expect(error.closest('[data-shell-cell="top"]') !== null).toBe(inHeader);
    },
  );

  it("standalone wide map keeps its own chrome", () => {
    mockedUseAdminMapWideLayout.mockReturnValue(true);

    renderWithRouter(<AdminMapScreen />, { route: "/map" });

    expect(screen.queryByRole("region", { name: "Course header" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Leg strip" })).not.toBeInTheDocument();
    expect(screen.getByRole("banner", { name: "Monitor status" })).toBeInTheDocument();
  });

  it.each([true, false])(
    "standalone map (wide=%s) has no roster or location subscription",
    (wide) => {
      mockedUseAdminMapWideLayout.mockReturnValue(wide);

      renderWithRouter(<AdminMapScreen />, { route: "/map" });

      expect(screen.queryByRole("region", { name: "Player roster" })).not.toBeInTheDocument();
      expect(mockedUsePlayerLocationsSync).toHaveBeenLastCalledWith(undefined);
    },
  );

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

    fireEvent.click(screen.getByRole("button", { name: "Open session log", hidden: true }));
    expect(controller.overlay.closeSheet).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open chat", hidden: true }));
    expect(controller.overlay.closeSheet).toHaveBeenCalledTimes(2);
  });
});
