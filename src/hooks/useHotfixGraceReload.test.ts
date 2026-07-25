import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHotfixGraceReload } from "./useHotfixGraceReload";

describe("useHotfixGraceReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays inactive when the client already meets the required version", () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5",
        clientVersion: "0.9.5.1",
        graceSeconds: 30,
        reload,
      }),
    );

    expect(result.current.active).toBe(false);
    expect(result.current.secondsRemaining).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it("counts down and calls reload when the grace period completes", () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 30,
        reload,
      }),
    );

    expect(result.current.active).toBe(true);
    expect(result.current.secondsRemaining).toBe(30);

    act(() => {
      vi.advanceTimersByTime(29_000);
    });
    expect(result.current.secondsRemaining).toBe(1);
    expect(reload).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.secondsRemaining).toBe(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads immediately when graceSeconds is 0", () => {
    const reload = vi.fn();
    renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 0,
        reload,
      }),
    );

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not arm when enabled is false", () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 5,
        enabled: false,
        reload,
      }),
    );

    expect(result.current.active).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(reload).not.toHaveBeenCalled();
  });
});
