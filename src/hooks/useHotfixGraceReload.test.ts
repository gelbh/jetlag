import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHotfixGraceReload } from "./useHotfixGraceReload";

describe("useHotfixGraceReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
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
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.active).toBe(false);
    expect(result.current.secondsRemaining).toBeNull();
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

  it("does not reload again after remount when the version was already acknowledged", () => {
    const reload = vi.fn();
    const { result: first } = renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 0,
        reload,
      }),
    );
    expect(reload).toHaveBeenCalledTimes(1);
    expect(first.current.active).toBe(false);

    const reloadAgain = vi.fn();
    const { result: second } = renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 0,
        reload: reloadAgain,
      }),
    );
    expect(reloadAgain).not.toHaveBeenCalled();
    expect(second.current.active).toBe(false);
    expect(second.current.secondsRemaining).toBeNull();
  });

  it("skips reload when durable acknowledgement cannot be stored", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const reload = vi.fn();
    renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.5.1",
        clientVersion: "0.9.5",
        graceSeconds: 0,
        reload,
      }),
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once for a new required version after a prior acknowledgement", () => {
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

    const reloadNext = vi.fn();
    renderHook(() =>
      useHotfixGraceReload({
        requiredMinAppVersion: "0.9.6",
        clientVersion: "0.9.5",
        graceSeconds: 0,
        reload: reloadNext,
      }),
    );
    expect(reloadNext).toHaveBeenCalledTimes(1);
  });
});
