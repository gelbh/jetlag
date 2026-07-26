import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  shouldEmitSeekingStarted,
  useSeekingStartedActivity,
} from "./useSeekingStartedActivity";

const emitSeekingStartedActivity = vi.hoisted(() => vi.fn());

vi.mock("../../services/session/emitSessionActivity", () => ({
  emitSeekingStartedActivity,
}));

describe("shouldEmitSeekingStarted", () => {
  const sessionRules = { hidingPeriodMinutes: 45 };

  it("emits when controller, timer started, and hiding period elapsed", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 45 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it("does not emit while still in hiding period", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 44 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it("does not emit before the timer has started", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: false,
        sessionRules,
        elapsedMs: 60 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it("does not emit on non-controlling clients", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: false,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 60 * 60 * 1000,
      }),
    ).toBe(false);
  });
});

describe("useSeekingStartedActivity", () => {
  // Clamped minimum hiding period is 5 minutes.
  const sessionRules = { hidingPeriodMinutes: 5 };
  const hidingMs = 5 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits on a tick after elapsed crosses the hiding boundary without timerState identity change", async () => {
    const now = 1_000_000;
    vi.setSystemTime(now);

    // Same timerState object for the whole test — identity never changes while running.
    // Start 1.5s before the hiding boundary so a tick (not a state update) crosses it.
    const timerState = {
      accumulatedMs: 0,
      runningSince: now - (hidingMs - 1_500),
    };

    renderHook(() =>
      useSeekingStartedActivity({
        sessionId: "session-1",
        canEmit: true,
        sessionRules,
        timerState,
      }),
    );

    expect(emitSeekingStartedActivity).not.toHaveBeenCalled();

    // Still inside the hiding period after the first tick.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(emitSeekingStartedActivity).not.toHaveBeenCalled();

    // Cross the boundary on the next 1s tick; emit once without timerState identity change.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(emitSeekingStartedActivity).toHaveBeenCalledTimes(1);
    expect(emitSeekingStartedActivity).toHaveBeenCalledWith("session-1");

    // Interval stops after emit — further ticks do not re-fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(emitSeekingStartedActivity).toHaveBeenCalledTimes(1);
  });
});
