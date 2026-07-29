import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "../../../navigation/RouteTransitionContext";
import { MapStatusRail } from "./MapStatusRail";

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

vi.mock("../preload/GameAreaPreloadBeacon", () => ({
  GameAreaPreloadBeacon: () => null,
}));

describe("MapStatusRail header home", () => {
  it("renders inline Home in the brand cell by default", () => {
    render(
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail
            sessionCode="ABCD"
            activeTool="none"
            syncStatus="synced"
            queuedWrites={0}
            timerState={{ accumulatedMs: 0, runningSince: null }}
            timerRunning={false}
            timerHasStarted={false}
            canStartGame={false}
            onStartGame={vi.fn()}
            onTimerStart={vi.fn()}
            onTimerPause={vi.fn()}
            onTimerReset={vi.fn()}
          />
        </RouteTransitionProvider>
      </MemoryRouter>,
    );

    const home = screen.getByRole("link", { name: "Home" });
    expect(home.closest(".jl-status-header-brand")).toBeTruthy();
  });

  it("keeps probe A composition with stamp-code and below-bar sync", () => {
    const { container } = render(
      <MemoryRouter>
        <RouteTransitionProvider>
          <MapStatusRail
            sessionCode="ABCD"
            activeTool="none"
            syncStatus="synced"
            queuedWrites={0}
            timerState={{ accumulatedMs: 0, runningSince: null }}
            timerRunning={false}
            timerHasStarted={false}
            canStartGame
            onStartGame={vi.fn()}
            onTimerStart={vi.fn()}
            onTimerPause={vi.fn()}
            onTimerReset={vi.fn()}
          />
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
