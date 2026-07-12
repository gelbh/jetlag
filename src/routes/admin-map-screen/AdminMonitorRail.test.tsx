import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminMonitorRail } from "./AdminMonitorRail";
import { createTestSession } from "../../test/fixtures/sessions";
import { renderWithRouter } from "../../test/renderWithRouter";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";

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
    observerPerspective: "both",
    setObserverPerspective: vi.fn(),
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
    suppressChromeHideRef: { current: false },
    mapViewport: null,
    setMapViewport: vi.fn(),
    activeThermometerWalk: null,
    lowPowerMode: false,
    distanceUnit: "metric",
    exitPath: "/admin",
  } as ObserverMapScreenController;
}

describe("AdminMonitorRail", () => {
  it("renders overview diagnostics by default", () => {
    const session = createTestSession();

    renderWithRouter(
      <AdminMonitorRail
        collapsed={false}
        onCollapsedChange={vi.fn()}
        activeTab="overview"
        onActiveTabChange={vi.fn()}
        session={session}
        sessionRules={session}
        syncStatusLabel="synced"
        controller={createController()}
        chatDisplayRole="admin"
        moderationBusy={false}
        moderationError={null}
        onModerationAction={vi.fn()}
        mapViewport={null}
        onLayerVisibilityChange={vi.fn()}
        onLowPowerModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Live stats")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText(session.code!)).toBeInTheDocument();
  });

  it("switches tabs when a tab button is clicked", () => {
    const onActiveTabChange = vi.fn();
    const session = createTestSession();

    renderWithRouter(
      <AdminMonitorRail
        collapsed={false}
        onCollapsedChange={vi.fn()}
        activeTab="overview"
        onActiveTabChange={onActiveTabChange}
        session={session}
        sessionRules={session}
        syncStatusLabel="synced"
        controller={createController()}
        chatDisplayRole="admin"
        moderationBusy={false}
        moderationError={null}
        onModerationAction={vi.fn()}
        mapViewport={null}
        onLayerVisibilityChange={vi.fn()}
        onLowPowerModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Sync" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("sync");
  });
});
