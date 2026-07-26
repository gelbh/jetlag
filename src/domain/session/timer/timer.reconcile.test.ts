import { describe, expect, it } from "vitest";
import {
  computeElapsedMs,
  reconcileTimerState,
  startTimer,
  pauseTimer,
  INITIAL_TIMER_STATE,
} from "./timer";

describe("reconcileTimerState committed tentacle", () => {
  it("prefers remote when local is stale", () => {
    const t0 = 1_000_000;
    const local = pauseTimer(startTimer(INITIAL_TIMER_STATE, t0), t0 + 5_000);
    const remote = startTimer({ accumulatedMs: 60_000, runningSince: t0 + 30_000 }, t0 + 60_000);
    const reconciled = reconcileTimerState(local, remote, t0 + 60_000);
    expect(computeElapsedMs(reconciled, t0 + 60_000)).toBe(90_000);
  });
});
