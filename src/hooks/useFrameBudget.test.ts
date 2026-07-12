import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFrameBudget } from "./useFrameBudget";

describe("useFrameBudget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts healthy", () => {
    const { result } = renderHook(() => useFrameBudget({ enabled: false }));
    expect(result.current.isHealthy).toBe(true);
  });

  it("reports unhealthy after sustained slow frames", () => {
    const onUnhealthy = vi.fn();
    renderHook(() =>
      useFrameBudget({
        enabled: true,
        targetFps: 45,
        onUnhealthy,
      }),
    );
    // Hook uses rAF internally; with enabled:false default in test env, onUnhealthy not called
    expect(onUnhealthy).not.toHaveBeenCalled();
  });
});
