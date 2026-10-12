import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { TimerState } from "../../domain/session/timer/timer";
import { useHiderZoneAdvisory } from "./useHiderZoneAdvisory";

const clock = vi.hoisted(() => ({ now: 0 }));
vi.mock("@/services/core/time/serverClock", () => ({ serverNow: () => clock.now }));

const START = 1_000_000;
const HIDING_MS = 10 * 60_000;
const sessionRules: SessionRulesInput = { gameSize: "medium", hidingPeriodMinutes: 10 };

const zone: HidingZoneRecord = {
  hiderUid: "hider",
  sessionId: "session",
  stationId: "station",
  stationName: "Station",
  center: { lat: 53.35, lng: -6.26 },
  radiusMeters: 500,
  geometryJson: "{}",
  status: "confirmed",
  confirmedAt: "2026-10-11T00:00:00.000Z",
};

// ~2.2 km north of the zone centre, well outside radius + buffer.
const outside = { lat: 53.37, lng: -6.26 };

function renderAdvisory(timerState: TimerState) {
  return renderHook(
    ({ timerState }) =>
      useHiderZoneAdvisory({
        enabled: true,
        zone,
        location: outside,
        accuracyMeters: 10,
        sessionRules,
        timerState,
      }),
    { initialProps: { timerState } },
  );
}

describe("useHiderZoneAdvisory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clock.now = START;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the advisory once hiding ends without any input change", () => {
    const { result } = renderAdvisory({ accumulatedMs: 0, runningSince: START - HIDING_MS + 1000 });
    expect(result.current).toBe(false);

    clock.now = START + 1500;
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(true);
  });

  it("re-arms when the wake fires just before the boundary", () => {
    const { result } = renderAdvisory({ accumulatedMs: 0, runningSince: START - HIDING_MS + 1000 });

    clock.now = START + 800;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);

    clock.now = START + 1800;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });

  it("uses a fresh clock when the timer resumes after a long pause", () => {
    const { result, rerender } = renderAdvisory({ accumulatedMs: 0, runningSince: null });
    expect(result.current).toBe(false);

    clock.now = START + 2 * HIDING_MS;
    rerender({ timerState: { accumulatedMs: 0, runningSince: clock.now - HIDING_MS - 5000 } });

    expect(result.current).toBe(true);
  });

  it("schedules no wake when the timer is paused or hiding is over", () => {
    renderAdvisory({ accumulatedMs: 0, runningSince: null });
    expect(vi.getTimerCount()).toBe(0);

    const { result } = renderAdvisory({ accumulatedMs: HIDING_MS + 1, runningSince: START });
    expect(result.current).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
