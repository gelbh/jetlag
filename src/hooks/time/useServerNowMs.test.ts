import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useServerNowMs } from "./useServerNowMs";

const clock = vi.hoisted(() => ({ now: 1_000_000 }));
vi.mock("@/services/core/time/serverClock", () => ({ serverNow: () => clock.now }));

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useServerNowMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clock.now = 1_000_000;
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("advances every tick", () => {
    const { result } = renderHook(() => useServerNowMs(1000));
    expect(result.current).toBe(1_000_000);
    clock.now = 1_001_000;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(1_001_000);
  });

  it("stays frozen when tickMs is null", () => {
    const { result } = renderHook(() => useServerNowMs(null));
    clock.now = 1_005_000;
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(1_000_000);
  });

  it("stops while hidden and resyncs when visible", () => {
    const { result } = renderHook(() => useServerNowMs(1000));
    act(() => setVisibility("hidden"));
    clock.now = 1_060_000;
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(1_000_000);
    act(() => setVisibility("visible"));
    expect(result.current).toBe(1_060_000);
  });
});
