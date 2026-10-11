import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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

  describe("roster slot", () => {
    function renderRail({ collapsed, roster }: { collapsed: boolean; roster?: ReactNode }) {
      const session = createTestSession();
      return renderWithRouter(
        <AdminMonitorRail
          collapsed={collapsed}
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
          roster={roster}
        />,
      );
    }

    it("renders the roster region before the tablist when expanded", () => {
      renderRail({ collapsed: false, roster: <p>Roster content</p> });

      const region = screen.getByRole("region", { name: "Player roster" });
      expect(region).toHaveTextContent("Roster content");
      const tablist = screen.getByRole("tablist", { name: "Monitor sections" });
      expect(
        region.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("hides the roster region when collapsed", () => {
      renderRail({ collapsed: true, roster: <p>Roster content</p> });

      expect(screen.queryByRole("region", { name: "Player roster" })).not.toBeInTheDocument();
    });

    it("omits the roster region when no roster is provided", () => {
      renderRail({ collapsed: false });

      expect(screen.queryByRole("region", { name: "Player roster" })).not.toBeInTheDocument();
    });
  });
});
