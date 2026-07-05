import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_TIMER_STATE, startTimer } from "../domain/timer";
import { useTimerStore } from "./timerStore";
import { resetAllStores } from "../test/helpers/storeReset";

describe("timerStore", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  it("returns the initial timer for unknown sessions", () => {
    expect(useTimerStore.getState().getTimer("session-1")).toEqual(
      INITIAL_TIMER_STATE,
    );
  });

  it("stores and clears timer state per session", () => {
    const running = startTimer(INITIAL_TIMER_STATE);
    useTimerStore.getState().setTimer("session-1", running);
    expect(useTimerStore.getState().getTimer("session-1").runningSince).toBe(
      running.runningSince,
    );

    useTimerStore.getState().clearTimer("session-1");
    expect(useTimerStore.getState().getTimer("session-1")).toEqual(
      INITIAL_TIMER_STATE,
    );
  });
});
