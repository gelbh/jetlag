import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestSession } from "../../test/fixtures/sessions";
import { renderWithRouter } from "../../test/renderWithRouter";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";
import { AdminMonitorRail } from "./AdminMonitorRail";

function createController(): ObserverMapScreenController {
  const session = createTestSession();
  return {
    session,
    myRole: "admin",
    uid: "admin-uid",
    sessionId: session.id,
    sessionRules: session,
    gameArea: session.gameArea ?? null,
    playAreaReady: true,
    center: [51.505, -0.09],
    mapFocusBounds: null,
    mapStyle: "standard",
    handleMapStyleChange: vi.fn(),
    effectiveBasemapStyle: "standard",
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
      chatDisplayRole: "admin",
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
      status: "synced",
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
    distanceUnit: "metric",
    exitPath: "/admin",
  } as unknown as ObserverMapScreenController;
}

type RailProps = Parameters<typeof AdminMonitorRail>[0];

function renderRail(overrides: Partial<RailProps> = {}) {
  const session = createTestSession();
  const props: RailProps = {
    collapsed: false,
    onCollapsedChange: vi.fn(),
    activeTab: "overview",
    onActiveTabChange: vi.fn(),
    session,
    sessionRules: session,
    syncStatusLabel: "synced",
    controller: createController(),
    chatDisplayRole: "admin",
    moderationBusy: false,
    onModerationAction: vi.fn(),
    mapViewport: null,
    onLayerVisibilityChange: vi.fn(),
    onLowPowerModeChange: vi.fn(),
    ...overrides,
  };
  renderWithRouter(<AdminMonitorRail {...props} />);
  return props;
}

describe("AdminMonitorRail", () => {
  it("renders overview diagnostics by default", () => {
    const { session } = renderRail();

    expect(screen.getByText("Live stats")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText(session.code!)).toBeInTheDocument();
  });

  it("switches tabs when a tab button is clicked", () => {
    const { onActiveTabChange } = renderRail();

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Sync" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("sync");
  });

  it("shows live stats as labelled cells", () => {
    const controller = createController();
    controller.pendingQuestions = [{ id: "q1" }, { id: "q2" }] as never;
    renderRail({ controller });

    expect(screen.getByRole("group", { name: "Questions" })).toHaveTextContent("2");
    expect(screen.getByRole("group", { name: "Timer" })).toHaveTextContent("Idle");
  });

  it("collapsed rail marks the active tab and expands on pick", () => {
    const { onActiveTabChange, onCollapsedChange } = renderRail({
      collapsed: true,
      activeTab: "log",
    });

    const nav = screen.getByRole("navigation", { name: "Monitor tabs" });
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(nav.querySelector('[aria-current="page"]')).toHaveAccessibleName("Log");

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("chat");
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});
