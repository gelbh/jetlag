import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_TIMER_STATE, startTimer } from "../domain/timer";
import { useSessionTimer } from "./useSessionTimer";

describe("useSessionTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts and pauses the timer for a session", () => {
    const onControl = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer("session-1", { onControl }),
    );

    act(() => {
      result.current.start();
    });

    expect(result.current.hasStarted).toBe(true);
    expect(onControl).toHaveBeenCalled();

    act(() => {
      result.current.pause();
    });

    expect(result.current.running).toBe(false);
  });

  it("resets timer state", () => {
    const { result } = renderHook(() => useSessionTimer("session-1"));

    act(() => {
      result.current.start();
      result.current.reset();
    });

    expect(result.current.hasStarted).toBe(false);
    expect(result.current.timerState).toEqual(INITIAL_TIMER_STATE);
  });

  it("mirrors remote timer state for guests", () => {
    const remote = startTimer(INITIAL_TIMER_STATE);
    const { result } = renderHook(() =>
      useSessionTimer("session-1", {
        canControl: false,
        remoteState: remote,
      }),
    );

    expect(result.current.timerState.runningSince).toBe(remote.runningSince);
  });
});
