import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerClockForTests } from "@/services/core/time/serverClock";
import { useReachability } from "./useReachability";

describe("useReachability", () => {
  beforeEach(() => {
    localStorage.clear();
    resetServerClockForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("marks reachable after a successful time probe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { "x-server-time": String(Date.now()) },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReachability(true));

    await waitFor(
      () => {
        expect(result.current.reachable).toBe(true);
      },
      { timeout: 3_000 },
    );
    expect(result.current.lastProbeAt).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/time",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("marks unreachable after two consecutive probe failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useReachability(true));

    await waitFor(
      () => {
        expect(result.current.reachable).toBe(false);
      },
      { timeout: 20_000 },
    );
  }, 25_000);

  it("does not probe when disabled", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());

    renderHook(() => useReachability(false));

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("re-probes on visibilitychange to visible and on pageshow", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 204, headers: { "x-server-time": String(Date.now()) } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useReachability(true, 60_000));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    visibility.mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(new Event("pageshow"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    visibility.mockRestore();
  });

  it("probeNow is stable, skips while a probe is in flight, and accumulates failures", async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((_, reject) => {
          release = () => reject(new TypeError("Failed to fetch"));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(() => useReachability(true, 60_000));
    const first = result.current.probeNow;
    rerender();
    expect(result.current.probeNow).toBe(first);

    // Initial probe in flight: probeNow is a no-op.
    act(() => result.current.probeNow());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.reachable).toBeNull();

    act(() => result.current.probeNow());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      release?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.reachable).toBe(false);
  });

  it("probeNow is a no-op while disabled", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    const { result } = renderHook(() => useReachability(false));
    act(() => result.current.probeNow());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("re-probes after a pre-resume in-flight probe and ignores its stale result", async () => {
    vi.useFakeTimers();
    const pending: Array<(value: Response) => void> = [];
    const rejecters: Array<(error: Error) => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          pending.push(resolve);
          rejecters.push(reject);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReachability(true, 60_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Stale pre-resume probe fails: ignored, then the resume probe runs.
    await act(async () => {
      rejecters[0]?.(new TypeError("Failed to fetch"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.lastProbeAt).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending[1]?.(
        new Response(null, { status: 204, headers: { "x-server-time": String(Date.now()) } }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.reachable).toBe(true);
  });
});
