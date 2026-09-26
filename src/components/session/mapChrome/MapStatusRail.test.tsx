import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "@/navigation/RouteTransitionContext";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { MapStatusRail } from "./MapStatusRail";

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

function renderRail(extra?: Partial<typeof railProps> & { canStartGame?: boolean }) {
  return render(
    <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail {...railProps} {...extra} />
        </RouteTransitionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
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
    expect(container.querySelector('[data-testid="map-status-rail-mantine"]')).toBeTruthy();
  });

  it("keeps frosted status bar + Start", () => {
    const { container } = renderRail({ canStartGame: true });
    const island = container.querySelector('[data-testid="tool-status-block-mantine"]');
    expect(island).toBeTruthy();
    expect(
      island?.querySelector('[data-testid="sync-block-mantine"]'),
    ).toBeTruthy();
    expect(
      island?.querySelector('[data-testid="sync-block-mantine"]')?.getAttribute(
        "role",
      ),
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
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
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
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to join" }),
    ).toBeInTheDocument();
  });
});
