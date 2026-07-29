import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_TIMER_STATE, startTimer } from "../../domain/session/timer/timer";
import { useTimerStore } from "../../state/timerStore";
import { useSessionTimer } from "./useSessionTimer";

describe("useSessionTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    useTimerStore.setState({ bySessionId: {} });
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

  it("pauses on unmount after start even if effect armed before running", () => {
    const onControl = vi.fn();
    const { result, unmount } = renderHook(() =>
      useSessionTimer("session-unmount", { onControl }),
    );

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    onControl.mockClear();

    unmount();

    expect(onControl).toHaveBeenCalledTimes(1);
    expect(onControl.mock.calls[0]?.[0]?.runningSince).toBeNull();
    expect(useTimerStore.getState().getTimer("session-unmount").runningSince).toBeNull();
  });

  it("clears stored timer when sessionResetAt changes", () => {
    const { result, rerender } = renderHook(
      ({ sessionResetAt }: { sessionResetAt?: string }) =>
        useSessionTimer("session-reset", {
          sessionResetAt,
          remoteSnapshot: INITIAL_TIMER_STATE,
        }),
      { initialProps: { sessionResetAt: undefined as string | undefined } },
    );

    act(() => {
      result.current.start();
    });

    expect(result.current.hasStarted).toBe(true);
    expect(useTimerStore.getState().getTimer("session-reset").runningSince).not.toBeNull();

    act(() => {
      rerender({ sessionResetAt: "2026-07-26T13:00:00.000Z" });
    });

    expect(result.current.timerState).toEqual(INITIAL_TIMER_STATE);
    expect(useTimerStore.getState().bySessionId["session-reset"]).toBeUndefined();
  });
});
