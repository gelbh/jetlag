import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "./RouteTransitionContext";
import { useRouteTransition } from "./useRouteTransition";
import { clearRouteWarmStateForTests } from "./routeWarmState";

vi.mock("./routePreloaders", async () => {
  const actual = await vi.importActual<typeof import("./routePreloaders")>(
    "./routePreloaders",
  );
  return {
    ...actual,
    preloadRoute: vi.fn(() => new Promise(() => undefined)),
  };
});

function PhaseProbe() {
  const { phase, resetStuckTransition, beginTransition } = useRouteTransition();
  return (
    <div>
      <span data-testid="phase">{phase}</span>
      <button type="button" onClick={() => void beginTransition("/map")}>
        Go map
      </button>
      <button type="button" onClick={() => resetStuckTransition()}>
        Reset stuck
      </button>
    </div>
  );
}

describe("RouteTransitionProvider resetStuckTransition", () => {
  beforeEach(() => {
    clearRouteWarmStateForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resets loading phase to idle", async () => {
    render(
      <MemoryRouter>
        <RouteTransitionProvider>
          <PhaseProbe />
        </RouteTransitionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("phase")).toHaveTextContent("idle");

    act(() => {
      screen.getByRole("button", { name: "Go map" }).click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(screen.getByTestId("phase")).toHaveTextContent("loading");

    act(() => {
      screen.getByRole("button", { name: "Reset stuck" }).click();
    });

    expect(screen.getByTestId("phase")).toHaveTextContent("idle");
  });
});
