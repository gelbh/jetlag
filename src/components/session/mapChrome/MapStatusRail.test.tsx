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
});
