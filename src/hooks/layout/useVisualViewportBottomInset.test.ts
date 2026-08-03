import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualViewportBottomInset } from "./useVisualViewportBottomInset";

type ViewportMock = {
  height: number;
  offsetTop: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatch: (type: string) => void;
};

function mockVisualViewport(opts: {
  height: number;
  offsetTop?: number;
  innerHeight: number;
}): ViewportMock {
  const listeners = new Map<string, Set<EventListener>>();
  const viewport: ViewportMock = {
    height: opts.height,
    offsetTop: opts.offsetTop ?? 0,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
    dispatch: (type: string) => {
      for (const listener of listeners.get(type) ?? []) {
        listener(new Event(type));
      }
    },
  };

  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: opts.innerHeight,
  });
  vi.stubGlobal("visualViewport", viewport);
  return viewport;
}

describe("useVisualViewportBottomInset", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("returns 0 when enabled is false", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const { result } = renderHook(() => useVisualViewportBottomInset(false));
    expect(result.current).toBe(0);
  });

  it("ignores large inset when no editable is focused", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(0);
  });

  it("applies inset when an input is focused", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(400);
  });

  it("returns 0 for sub-threshold raw inset even when focused", () => {
    mockVisualViewport({ height: 750, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(0);
  });

  it("clears inset on blur and recomputes on visibilitychange", () => {
    const viewport = mockVisualViewport({ height: 400, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(400);

    act(() => {
      input.blur();
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(0);

    act(() => {
      input.focus();
      viewport.height = 350;
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(result.current).toBe(450);
  });
});
