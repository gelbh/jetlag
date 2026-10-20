import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HIDING_ZONE_PIN_TRAVEL_MS } from "./hidingZoneDraftPinTravel";
import { useHidingZoneDraftDisplayCenter } from "./useHidingZoneDraftDisplayCenter";

const motionProfile = vi.hoisted(() => ({
  animate: true,
}));

vi.mock("@/hooks/motion/useMotionProfile", () => ({
  useMotionProfile: () => motionProfile,
}));

describe("useHidingZoneDraftDisplayCenter", () => {
  beforeEach(() => {
    motionProfile.animate = true;
    vi.useFakeTimers({ toFake: ["performance", "requestAnimationFrame"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when center is null", () => {
    const { result } = renderHook(() => useHidingZoneDraftDisplayCenter(null));
    expect(result.current).toBeNull();
  });

  it("jumps display to the new center when reduced motion", () => {
    motionProfile.animate = false;
    const { result, rerender } = renderHook(
      ({ center }) => useHidingZoneDraftDisplayCenter(center),
      { initialProps: { center: [53.35, -6.26] as [number, number] } },
    );

    rerender({ center: [53.3503, -6.2603] });

    expect(result.current).toEqual([53.3503, -6.2603]);
  });

  it("tweens display from the previous center when animate is allowed", () => {
    const { result, rerender } = renderHook(
      ({ center }) => useHidingZoneDraftDisplayCenter(center),
      { initialProps: { center: [53.35, -6.26] as [number, number] } },
    );

    rerender({ center: [53.3503, -6.2603] });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current![0]).toBeCloseTo(53.35, 4);

    act(() => {
      vi.advanceTimersByTime(HIDING_ZONE_PIN_TRAVEL_MS);
    });

    expect(result.current).toEqual([53.3503, -6.2603]);
  });
});
