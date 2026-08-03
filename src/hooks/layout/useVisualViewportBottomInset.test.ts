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
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const { result } = renderHook(() => useVisualViewportBottomInset(false));
    expect(result.current).toBe(0);
  });

  it("ignores large inset when no editable is focused", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(0);
  });

  it("applies inset when a text input is focused", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(400);
  });

  it("applies inset for textarea and contenteditable", () => {
    mockVisualViewport({ height: 400, innerHeight: 800 });
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    const { result, rerender } = renderHook(() =>
      useVisualViewportBottomInset(true),
    );
    expect(result.current).toBe(400);

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    document.body.appendChild(editable);
    act(() => {
      editable.focus();
      window.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    rerender();
    expect(result.current).toBe(400);
  });

  it("does not lift for checkbox, button, or select focus", () => {
    const viewport = mockVisualViewport({ height: 400, innerHeight: 800 });
    const { result } = renderHook(() => useVisualViewportBottomInset(true));

    for (const el of [
      Object.assign(document.createElement("input"), { type: "checkbox" }),
      Object.assign(document.createElement("input"), { type: "button" }),
      document.createElement("select"),
    ]) {
      document.body.appendChild(el);
      act(() => {
        el.focus();
        window.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        viewport.dispatch("resize");
      });
      expect(result.current).toBe(0);
    }
  });

  it("returns 0 for sub-threshold raw inset even when focused", () => {
    mockVisualViewport({ height: 750, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(0);
  });

  it("clears inset after blur via focusin to body and resize", () => {
    const viewport = mockVisualViewport({ height: 400, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(400);

    act(() => {
      input.blur();
      document.body.focus?.();
      window.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      viewport.dispatch("resize");
    });
    expect(result.current).toBe(0);
  });

  it("recomputes on pageshow after resume with focused input", () => {
    const viewport = mockVisualViewport({ height: 400, innerHeight: 800 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useVisualViewportBottomInset(true));
    expect(result.current).toBe(400);

    act(() => {
      viewport.height = 350;
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(result.current).toBe(450);
  });
});
