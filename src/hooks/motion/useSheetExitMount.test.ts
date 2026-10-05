import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION_SHEET_PRESENT_MS } from "@/domain/device/motion/motionTokens";
import { useSheetExitMount } from "./useSheetExitMount";

describe("useSheetExitMount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mounts when open becomes true and stays mounted until exit end", () => {
    const { result, rerender } = renderHook(({ open }) => useSheetExitMount(open), {
      initialProps: { open: false },
    });

    expect(result.current.mounted).toBe(false);

    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.open).toBe(true);

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.open).toBe(false);

    act(() => {
      result.current.onExitTransitionEnd();
    });
    expect(result.current.mounted).toBe(false);
  });

  it("ignores exit end while still open", () => {
    const { result } = renderHook(() => useSheetExitMount(true));
    act(() => {
      result.current.onExitTransitionEnd();
    });
    expect(result.current.mounted).toBe(true);
  });

  it("clears mounted after sheet duration if exit callback never fires", () => {
    const { result, rerender } = renderHook(({ open }) => useSheetExitMount(open), {
      initialProps: { open: true },
    });

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(MOTION_SHEET_PRESENT_MS + 50);
    });
    expect(result.current.mounted).toBe(false);
  });

  it("keeps a stable onExitTransitionEnd identity across rerenders", () => {
    const { result, rerender } = renderHook(({ open }) => useSheetExitMount(open), {
      initialProps: { open: true },
    });
    const first = result.current.onExitTransitionEnd;
    rerender({ open: false });
    expect(result.current.onExitTransitionEnd).toBe(first);
  });
});
