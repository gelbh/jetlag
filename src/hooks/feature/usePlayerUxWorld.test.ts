import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  setPlayerUxWorldFlagForTests,
  readPlayerUxWorldFlag,
  PLAYER_UX_WORLD_FLAG_KEY,
} from "@/services/core/analytics/playerUxWorldFlag";
import { usePlayerUxWorld } from "./usePlayerUxWorld";

const isFeatureEnabled = vi.fn();
const onFeatureFlags = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    isFeatureEnabled: (...args: unknown[]) => isFeatureEnabled(...args),
    onFeatureFlags: (...args: unknown[]) => onFeatureFlags(...args),
  },
}));

describe("readPlayerUxWorldFlag", () => {
  afterEach(() => {
    setPlayerUxWorldFlagForTests(null);
    localStorage.removeItem("jl.playerUxWorld");
  });

  it("defaults to false when PostHog returns undefined", () => {
    expect(readPlayerUxWorldFlag(() => undefined)).toBe(false);
  });

  it("defaults to false when PostHog returns false", () => {
    expect(readPlayerUxWorldFlag(() => false)).toBe(false);
  });

  it("is true only when PostHog returns true", () => {
    expect(readPlayerUxWorldFlag(() => true)).toBe(true);
  });

  it("honors localStorage on/off over PostHog", () => {
    localStorage.setItem("jl.playerUxWorld", "on");
    expect(readPlayerUxWorldFlag(() => false)).toBe(true);
    localStorage.setItem("jl.playerUxWorld", "off");
    expect(readPlayerUxWorldFlag(() => true)).toBe(false);
    localStorage.removeItem("jl.playerUxWorld");
  });
});

describe("usePlayerUxWorld", () => {
  beforeEach(() => {
    setPlayerUxWorldFlagForTests(null);
    isFeatureEnabled.mockReset();
    onFeatureFlags.mockReset();
    onFeatureFlags.mockImplementation(() => () => {});
    isFeatureEnabled.mockReturnValue(undefined);
  });

  afterEach(() => {
    setPlayerUxWorldFlagForTests(null);
  });

  it("defaults off when the flag is unset", () => {
    const { result } = renderHook(() => usePlayerUxWorld());
    expect(result.current).toBe(false);
    expect(isFeatureEnabled).toHaveBeenCalledWith(PLAYER_UX_WORLD_FLAG_KEY);
  });

  it("returns true when PostHog enables the flag", () => {
    isFeatureEnabled.mockReturnValue(true);
    const { result } = renderHook(() => usePlayerUxWorld());
    expect(result.current).toBe(true);
  });

  it("honors test override without reading PostHog truthy", () => {
    setPlayerUxWorldFlagForTests(false);
    isFeatureEnabled.mockReturnValue(true);
    const { result } = renderHook(() => usePlayerUxWorld());
    expect(result.current).toBe(false);
  });

  it("resubscribes when PostHog feature flags refresh", () => {
    let listener: (() => void) | undefined;
    onFeatureFlags.mockImplementation((cb: () => void) => {
      listener = cb;
      return () => {
        listener = undefined;
      };
    });
    isFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => usePlayerUxWorld());
    expect(result.current).toBe(false);

    isFeatureEnabled.mockReturnValue(true);
    act(() => {
      listener?.();
    });
    expect(result.current).toBe(true);
  });
});
