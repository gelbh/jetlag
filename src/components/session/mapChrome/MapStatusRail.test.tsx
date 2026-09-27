import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "@/navigation/RouteTransitionContext";
import { jetlagTheme } from "@/theme/theme";
import {
  MapStatusRail,
  type MapStatusRailModel,
  type MapStatusRailProps,
} from "./MapStatusRail";

const { showEphemeral } = vi.hoisted(() => ({
  showEphemeral: vi
    .fn<(input: { title: string; message: string }) => boolean>()
    .mockReturnValue(true),
}));

vi.mock("../../ui/notifications/showEphemeralPlayerNotification", () => ({
  showEphemeralPlayerNotification: (
    input: { title: string; message: string },
  ) => showEphemeral(input),
}));

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

vi.mock("../preload/GameAreaPreloadBeacon", () => ({
  GameAreaPreloadBeacon: () => null,
}));

vi.mock("../../../hooks/map-screen/useLeaderJoinRequests", () => ({
  useLeaderJoinRequests: () => ({
    pendingJoinRequest: null,
    joinRequestBusy: false,
    joinRequestError: null,
    handleAcceptJoinRequest: vi.fn(),
    handleDeclineJoinRequest: vi.fn(),
  }),
}));

const baseModel: MapStatusRailModel = {
  sessionCode: "ABCD",
  activeTool: "none",
  syncStatus: "synced",
  queuedWrites: 0,
  timerState: { accumulatedMs: 0, runningSince: null },
  timerRunning: false,
  timerHasStarted: false,
  canStartGame: false,
  onStartGame: vi.fn(),
  onTimerStart: vi.fn(),
  onTimerPause: vi.fn(),
  onTimerReset: vi.fn(),
};

function renderRail(
  extra?: Partial<MapStatusRailModel> & {
    headerLeading?: MapStatusRailProps["headerLeading"];
  },
) {
  const { headerLeading, ...modelExtra } = extra ?? {};
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail
            model={{ ...baseModel, ...modelExtra }}
            headerLeading={headerLeading}
          />
        </RouteTransitionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  showEphemeral.mockClear();
  showEphemeral.mockImplementation(() => true);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: typeof query === "string" && query.includes("min-width: 380"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("MapStatusRail public props (AC #1)", () => {
  it("accepts a single model options object plus optional headerLeading", () => {
    const props: MapStatusRailProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MapStatusRailProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionProvider>
            <MapStatusRail {...props} />
          </RouteTransitionProvider>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByTestId("map-status-rail-mantine")).toBeInTheDocument();
  });
});

describe("MapStatusRail header home", () => {
  it("renders inline Home in the brand cell by default", () => {
    renderRail();

    const home = screen.getByRole("link", { name: "Home" });
    expect(home.closest(".jl-status-header-brand")).toBeTruthy();
  });
});

describe("MapStatusRail Mantine", () => {
  it("mounts Mantine rail chrome", () => {
    const { container } = renderRail();
    expect(
      container.querySelector('[data-testid="map-status-rail-mantine"]'),
    ).toBeTruthy();
  });

  it("keeps frosted status bar + Start", () => {
    const { container } = renderRail({ canStartGame: true });
    const island = container.querySelector(
      '[data-testid="tool-status-block-mantine"]',
    );
    expect(island).toBeTruthy();
    expect(
      island?.querySelector('[data-testid="sync-block-mantine"]'),
    ).toBeTruthy();
    expect(
      island
        ?.querySelector('[data-testid="sync-block-mantine"]')
        ?.getAttribute("role"),
    ).toBe("status");
    expect(container.querySelector(".jl-status-header")).toBeNull();
    expect(container.querySelector(".jl-status-bar")).toBeNull();
    expect(container.querySelector(".jl-ticker")).toBeNull();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
  });
});

describe("MapStatusRail inactive chrome", () => {
  it("shows retry and return to join for terminal session errors", () => {
    const onRetry = vi.fn();
    const onReturnToJoin = vi.fn();
    renderRail({
      syncStatus: "error",
      message: "That session no longer exists.",
      timerState: { accumulatedMs: 120_000, runningSince: Date.now() - 60_000 },
      timerRunning: true,
      timerHasStarted: true,
      inactiveChrome: true,
      terminalSessionError: {
        title: "Session gone",
        message: "That session no longer exists.",
        action: "retry",
        actionLabel: "Retry",
        secondaryAction: "rejoin",
        secondaryActionLabel: "Return to join",
      },
      onSyncErrorAction: onRetry,
      onReturnToJoin,
    });

    expect(screen.getByText("Session gone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to join" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReturnToJoin).toHaveBeenCalledTimes(1);
    expect(showEphemeral).not.toHaveBeenCalled();
  });
});

describe("MapStatusRail error channels (W5-F2)", () => {
  it("routes actionful sync errors to sticky Alert", () => {
    const onRetry = vi.fn();
    renderRail({
      syncStatus: "error",
      message: "Sync failed · permission denied",
      onSyncErrorAction: onRetry,
    });

    expect(screen.getByText("Sync failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(showEphemeral).not.toHaveBeenCalled();
  });

  it("keeps actionful sync errors sticky when retry callback is missing", () => {
    const { container } = renderRail({
      syncStatus: "error",
      message: "Sync failed · permission denied",
    });

    expect(screen.getByText("Sync failed")).toBeInTheDocument();
    expect(container.querySelector(".mantine-Alert-root")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(showEphemeral).not.toHaveBeenCalled();
  });

  it("routes action-free errors to ephemeral toast", () => {
    const { container } = renderRail({
      syncStatus: "error",
      message: "Sync failed · permission denied",
      inactiveChrome: true,
      terminalSessionError: {
        title: "Heads up",
        message: "Session paused briefly.",
      },
      onSyncErrorAction: vi.fn(),
      onReturnToJoin: vi.fn(),
    });

    expect(showEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Heads up",
        message: "Session paused briefly.",
      }),
    );
    expect(container.querySelector(".mantine-Alert-root")).toBeNull();
  });
});
