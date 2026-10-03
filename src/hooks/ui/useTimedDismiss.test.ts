import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimedDismiss } from "./useTimedDismiss";

describe("useTimedDismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onDismiss after ms when active", () => {
    const onDismiss = vi.fn();
    renderHook(() => useTimedDismiss({ active: true, ms: 8000, onDismiss }));
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(7999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire when inactive", () => {
    const onDismiss = vi.fn();
    renderHook(() => useTimedDismiss({ active: false, ms: 8000, onDismiss }));
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("resets when active flips off then on", () => {
    const onDismiss = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useTimedDismiss({ active, ms: 4000, onDismiss }),
      { initialProps: { active: true } },
    );
    vi.advanceTimersByTime(2000);
    rerender({ active: false });
    rerender({ active: true });
    vi.advanceTimersByTime(3999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("resets when restartKey changes while active stays true", () => {
    const onDismiss = vi.fn();
    const { rerender } = renderHook(
      ({ restartKey }) =>
        useTimedDismiss({
          active: true,
          ms: 4000,
          onDismiss,
          restartKey,
        }),
      { initialProps: { restartKey: "first" } },
    );
    vi.advanceTimersByTime(2000);
    rerender({ restartKey: "second" });
    vi.advanceTimersByTime(3999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
