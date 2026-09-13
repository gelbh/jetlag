import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "@/navigation/RouteTransitionContext";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { MapStatusRail } from "./MapStatusRail";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
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

const railProps = {
  sessionCode: "ABCD",
  activeTool: "none" as const,
  syncStatus: "synced" as const,
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

function renderRail() {
  return render(
    <MemoryRouter>
      <RouteTransitionProvider>
        <MapStatusRail {...railProps} />
      </RouteTransitionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("MapStatusRail header home", () => {
  it("renders inline Home in the brand cell by default", () => {
    renderRail();

    const home = screen.getByRole("link", { name: "Home" });
    expect(home.closest(".jl-status-header-brand")).toBeTruthy();
  });

  it("keeps ticker-band composition with stamp-code and below-bar sync", () => {
    const { container } = render(
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail {...railProps} canStartGame />
        </RouteTransitionProvider>
      </MemoryRouter>,
    );

    expect(container.querySelector(".jl-status-header")).toBeTruthy();
    expect(screen.getByText("ABCD").closest(".jl-stamp-code")).toBeTruthy();
    expect(screen.getByRole("button", { name: /start/i }).className).toContain(
      "jl-status-header-start",
    );
    expect(container.querySelector(".jl-sync-map-indicator")).toBeTruthy();
    expect(
      container.querySelector(".jl-sync-map-indicator")?.closest(".jl-status-header"),
    ).toBeNull();
  });
});

describe("MapStatusRail Mantine gate", () => {
  it("keeps Legacy survey rail when flag is off", () => {
    const { container } = renderRail();
    expect(container.querySelector(".jl-status-rail")).toBeTruthy();
    expect(container.querySelector('[data-testid="map-status-rail-mantine"]')).toBeNull();
  });

  it("mounts Mantine rail chrome when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    const { container } = render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionProvider>
            <MapStatusRail {...railProps} />
          </RouteTransitionProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(container.querySelector('[data-testid="map-status-rail-mantine"]')).toBeTruthy();
    expect(container.querySelector('[data-player-ux-world="mantine"]')).toBeTruthy();
  });
});

describe("MapStatusRail inactive chrome", () => {
  it("shows retry and return to join for terminal session errors", () => {
    render(
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail
            sessionCode="ABCD"
            activeTool="none"
            syncStatus="error"
            queuedWrites={0}
            message="That session no longer exists."
            timerState={{ accumulatedMs: 120_000, runningSince: Date.now() - 60_000 }}
            timerRunning
            timerHasStarted
            canStartGame={false}
            onStartGame={vi.fn()}
            onTimerStart={vi.fn()}
            onTimerPause={vi.fn()}
            onTimerReset={vi.fn()}
            inactiveChrome
            terminalSessionError={{
              title: "Session gone",
              message: "That session no longer exists.",
              action: "retry",
              actionLabel: "Retry",
              secondaryAction: "rejoin",
              secondaryActionLabel: "Return to join",
            }}
            onSyncErrorAction={vi.fn()}
            onReturnToJoin={vi.fn()}
          />
        </RouteTransitionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to join" }),
    ).toBeInTheDocument();
  });
});
