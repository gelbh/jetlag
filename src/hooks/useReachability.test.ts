import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReachability } from "./useReachability";

describe("useReachability", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("marks reachable after a successful health probe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    const { result } = renderHook(() => useReachability(true));

    await waitFor(
      () => {
        expect(result.current.reachable).toBe(true);
      },
      { timeout: 3_000 },
    );
    expect(result.current.lastProbeAt).not.toBeNull();
  });

  it("marks unreachable after two consecutive probe failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

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
});
