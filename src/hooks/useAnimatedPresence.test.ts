import { renderHook, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useAnimatedPresence } from "./useAnimatedPresence";
import { resetAllStores } from "../test/helpers/storeReset";

describe("useAnimatedPresence", () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.dataset.motion = "full";
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("mounts immediately when open with full motion", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedPresence({ open: true, onClose }),
    );

    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("entering");
    expect(result.current.animClass).toBe("hud-sheet-enter");
  });

  it("skips enter animation when motion is reduced", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedPresence({ open: true, onClose }),
    );

    expect(result.current.phase).toBe("open");
    expect(result.current.animClass).toBe("");
  });

  it("requestClose runs exit then calls onClose", () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useAnimatedPresence({ open, onClose, durationMs: 200 }),
      { initialProps: { open: true } },
    );

    act(() => {
      result.current.requestClose();
    });

    expect(result.current.phase).toBe("exiting");
    expect(result.current.animClass).toBe("hud-sheet-exit");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.mounted).toBe(false);

    rerender({ open: false });
  });
});
