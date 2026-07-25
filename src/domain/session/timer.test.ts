import { describe, expect, it } from "vitest";
import {
  isHidingTimerEffectivelyRunning,
  pausePreferringRemote,
  computeElapsedMs,
  formatElapsedTime,
  hasTimerStarted,
  INITIAL_TIMER_STATE,
  pauseTimer,
  resetTimer,
  startTimer,
  timerStateFromRemote,
  timerStateToRemote,
  reconcileTimerState,
} from "./timer";

describe("formatElapsedTime", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(formatElapsedTime(65_000)).toBe("01:05");
  });

  it("formats hour-long durations as h:mm:ss", () => {
    expect(formatElapsedTime(3_661_000)).toBe("1:01:01");
  });
});

describe("timer state machine", () => {
  const t0 = 1_000_000;

  it("starts paused at zero elapsed", () => {
    expect(computeElapsedMs(INITIAL_TIMER_STATE, t0)).toBe(0);
    expect(hasTimerStarted(INITIAL_TIMER_STATE)).toBe(false);
  });

  it("tracks elapsed while running", () => {
    const running = startTimer(INITIAL_TIMER_STATE, t0);
    expect(computeElapsedMs(running, t0 + 5_000)).toBe(5_000);
    expect(hasTimerStarted(running)).toBe(true);
  });

  it("pauses and resumes without losing elapsed time", () => {
    const running = startTimer(INITIAL_TIMER_STATE, t0);
    const paused = pauseTimer(running, t0 + 10_000);
    expect(computeElapsedMs(paused, t0 + 60_000)).toBe(10_000);

    const resumed = startTimer(paused, t0 + 60_000);
    expect(computeElapsedMs(resumed, t0 + 65_000)).toBe(15_000);
  });

  it("resets to initial state", () => {
    const running = startTimer(INITIAL_TIMER_STATE, t0);
    const paused = pauseTimer(running, t0 + 1_000);
    expect(resetTimer()).toEqual(INITIAL_TIMER_STATE);
    expect(hasTimerStarted(paused)).toBe(true);
  });

  it("handles background time gaps via wall clock anchor", () => {
    const running = startTimer(INITIAL_TIMER_STATE, t0);
    expect(computeElapsedMs(running, t0 + 120_000)).toBe(120_000);
  });

  it("serializes and restores remote timer state", () => {
    const running = startTimer({ accumulatedMs: 30_000, runningSince: t0 }, t0);
    const remote = timerStateToRemote(running);
    expect(remote).toEqual({
      timerAccumulatedMs: 30_000,
      timerRunningSince: new Date(t0).toISOString(),
    });

    const restored = timerStateFromRemote(
      remote.timerAccumulatedMs,
      remote.timerRunningSince,
    );
    expect(computeElapsedMs(restored, t0 + 10_000)).toBe(40_000);
  });
});

describe("reconcileTimerState", () => {
  const t0 = 1_000_000;

  it("returns initial when neither side has started", () => {
    expect(reconcileTimerState(INITIAL_TIMER_STATE, INITIAL_TIMER_STATE, t0)).toEqual(
      INITIAL_TIMER_STATE,
    );
  });

  it("prefers remote when local is stale", () => {
    const local = pauseTimer(startTimer(INITIAL_TIMER_STATE, t0), t0 + 5_000);
    const remote = startTimer({ accumulatedMs: 60_000, runningSince: t0 + 30_000 }, t0 + 60_000);
    const reconciled = reconcileTimerState(local, remote, t0 + 60_000);
    expect(computeElapsedMs(reconciled, t0 + 60_000)).toBe(90_000);
  });

  it("prefers paused when elapsed is close and running state disagrees", () => {
    const local = pauseTimer(startTimer(INITIAL_TIMER_STATE, t0), t0 + 10_000);
    const remote = startTimer(
      { accumulatedMs: 10_000, runningSince: t0 + 10_000 },
      t0 + 10_000,
    );
    const reconciled = reconcileTimerState(local, remote, t0 + 12_000);
    expect(reconciled.runningSince).toBeNull();
    expect(computeElapsedMs(reconciled, t0 + 12_000)).toBe(10_000);
  });

  it("prefers remote paused when local is still running and elapsed is close", () => {
    const remote = pauseTimer(startTimer(INITIAL_TIMER_STATE, t0), t0 + 10_000);
    const local = startTimer(
      { accumulatedMs: 10_000, runningSince: t0 + 10_000 },
      t0 + 10_000,
    );
    const reconciled = reconcileTimerState(local, remote, t0 + 12_000);
    expect(reconciled.runningSince).toBeNull();
    expect(computeElapsedMs(reconciled, t0 + 12_000)).toBe(10_000);
  });
});

describe("isHidingTimerEffectivelyRunning", () => {
  it("is true when local or remote is running", () => {
    expect(isHidingTimerEffectivelyRunning(true, false)).toBe(true);
    expect(isHidingTimerEffectivelyRunning(false, true)).toBe(true);
    expect(isHidingTimerEffectivelyRunning(true, true)).toBe(true);
    expect(isHidingTimerEffectivelyRunning(false, false)).toBe(false);
  });
});

describe("pausePreferringRemote", () => {
  it("adopts running remote before pausing when local is already paused", () => {
    const local = { accumulatedMs: 1_000, runningSince: null };
    const remote = { accumulatedMs: 1_000, runningSince: 1_000 };
    const paused = pausePreferringRemote(local, remote, 5_000);
    expect(paused.runningSince).toBeNull();
    expect(paused.accumulatedMs).toBe(5_000);
  });

  it("keeps local timing when both states are running", () => {
    const local = { accumulatedMs: 1_000, runningSince: 3_000 };
    const remote = { accumulatedMs: 1_000, runningSince: 1_000 };
    expect(pausePreferringRemote(local, remote, 5_000)).toEqual({
      accumulatedMs: 3_000,
      runningSince: null,
    });
  });
});
