import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_TIMER_STATE, startTimer } from "../domain/session/timer/timer";
import { resetAllStores } from "../test/helpers/storeReset";
import { useTimerStore } from "./timerStore";

describe("timerStore", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  it("returns the initial timer for unknown sessions", () => {
    expect(useTimerStore.getState().getTimer("session-1")).toEqual(INITIAL_TIMER_STATE);
  });

  it("stores and clears timer state per session", () => {
    const running = startTimer(INITIAL_TIMER_STATE);
    useTimerStore.getState().setTimer("session-1", running);
    expect(useTimerStore.getState().getTimer("session-1").runningSince).toBe(running.runningSince);

    useTimerStore.getState().clearTimer("session-1");
    expect(useTimerStore.getState().getTimer("session-1")).toEqual(INITIAL_TIMER_STATE);
  });

  it("persists to localStorage so a running timer survives a killed tab", () => {
    const running = startTimer(INITIAL_TIMER_STATE);
    useTimerStore.getState().setTimer("session-1", running);

    const stored = JSON.parse(localStorage.getItem("jetlag-timer") ?? "null");
    expect(stored.state.bySessionId["session-1"]).toEqual(running);
    expect(sessionStorage.getItem("jetlag-timer")).toBeNull();
  });
});

describe("timerStore sessionStorage migration", () => {
  const legacyRunning = { accumulatedMs: 5_000, runningSince: 1_700_000_000_000 };
  const blob = (state: object) => JSON.stringify({ state: { bySessionId: state }, version: 0 });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  async function loadStore() {
    return (await import("./timerStore")).useTimerStore;
  }

  it("copies a legacy sessionStorage timer into localStorage once", async () => {
    sessionStorage.setItem("jetlag-timer", blob({ "session-1": legacyRunning }));

    const store = await loadStore();

    expect(store.getState().getTimer("session-1")).toEqual(legacyRunning);
    expect(localStorage.getItem("jetlag-timer")).toBe(blob({ "session-1": legacyRunning }));
    expect(sessionStorage.getItem("jetlag-timer")).toBeNull();
  });

  it("keeps an existing localStorage timer over a legacy copy", async () => {
    const current = { accumulatedMs: 9_000, runningSince: null };
    localStorage.setItem("jetlag-timer", blob({ "session-1": current }));
    sessionStorage.setItem("jetlag-timer", blob({ "session-1": legacyRunning }));

    const store = await loadStore();

    expect(store.getState().getTimer("session-1")).toEqual(current);
    expect(sessionStorage.getItem("jetlag-timer")).toBeNull();
  });
});
