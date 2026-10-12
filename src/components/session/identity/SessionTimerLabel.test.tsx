import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionTimerLabel } from "./SessionTimerLabel";

const clock = vi.hoisted(() => ({ now: 10_000 }));
vi.mock("@/services/core/time/serverClock", () => ({ serverNow: () => clock.now }));

beforeEach(() => {
  vi.useFakeTimers();
  clock.now = 10_000;
});
afterEach(() => vi.useRealTimers());

it("ticks a running timer from the server clock", () => {
  render(
    <span data-testid="t">
      <SessionTimerLabel timerState={{ accumulatedMs: 0, runningSince: 10_000 }} />
    </span>,
  );
  const before = screen.getByTestId("t").textContent;
  clock.now = 13_000;
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByTestId("t").textContent).not.toBe(before);
});
