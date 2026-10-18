import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAllStores } from "../../test/helpers/storeReset";
import { useAnimatedPresence } from "./useAnimatedPresence";

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
    const { result } = renderHook(() => useAnimatedPresence({ open: true, onClose }));

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
    const { result } = renderHook(() => useAnimatedPresence({ open: true, onClose }));

    expect(result.current.phase).toBe("open");
    expect(result.current.animClass).toBe("");
  });

  it("calls onClose once under StrictMode when closing with reduced motion", async () => {
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
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useAnimatedPresence({ open, onClose }),
      {
        initialProps: { open: true },
        wrapper: ({ children }) => createElement(StrictMode, null, children),
      },
    );

    rerender({ open: false });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.phase).toBe("closed");
    expect(onClose).toHaveBeenCalledTimes(1);
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
