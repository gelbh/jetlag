import { act, renderHook } from "@testing-library/react";
import { type MutableRefObject, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStickScrollToBottom } from "./useStickScrollToBottom";

function mockScrollMetrics(
  el: HTMLElement,
  metrics: { scrollHeight: number; clientHeight: number; scrollTop?: number },
) {
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    get: () => metrics.scrollHeight,
  });
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    get: () => metrics.clientHeight,
  });
  let top = metrics.scrollTop ?? 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
}

async function flushStickFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function attachSentinel(ref: RefObject<HTMLDivElement | null>, sentinel: HTMLDivElement) {
  (ref as MutableRefObject<HTMLDivElement | null>).current = sentinel;
}

describe("useStickScrollToBottom", () => {
  let scrollIntoView: typeof HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    document.body.innerHTML = "";
    scrollIntoView = vi.fn() as typeof HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("scrolls the nearest overflow parent and does not call scrollIntoView", async () => {
    const outer = document.createElement("div");
    outer.style.overflowY = "auto";
    mockScrollMetrics(outer, {
      scrollHeight: 2000,
      clientHeight: 400,
      scrollTop: 0,
    });

    const inner = document.createElement("div");
    inner.style.overflowY = "auto";
    mockScrollMetrics(inner, {
      scrollHeight: 800,
      clientHeight: 200,
      scrollTop: 0,
    });

    const sentinel = document.createElement("div");
    inner.appendChild(sentinel);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const { result, rerender } = renderHook(({ dep }) => useStickScrollToBottom(dep), {
      initialProps: { dep: 0 },
    });

    attachSentinel(result.current, sentinel);

    rerender({ dep: 1 });
    await flushStickFrame();
    await vi.waitFor(() => {
      expect(inner.scrollTop).toBe(800);
    });
    expect(outer.scrollTop).toBe(0);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("sticks to a short inner overflow parent and does not scroll the outer", async () => {
    const outer = document.createElement("div");
    outer.style.overflowY = "auto";
    mockScrollMetrics(outer, {
      scrollHeight: 2000,
      clientHeight: 400,
      scrollTop: 0,
    });

    const inner = document.createElement("div");
    inner.style.overflowY = "auto";
    // Fits without scrolling; old height gate would skip this and hit outer.
    mockScrollMetrics(inner, {
      scrollHeight: 100,
      clientHeight: 200,
      scrollTop: 0,
    });

    const sentinel = document.createElement("div");
    inner.appendChild(sentinel);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const { result, rerender } = renderHook(({ dep }) => useStickScrollToBottom(dep), {
      initialProps: { dep: 0 },
    });

    attachSentinel(result.current, sentinel);

    rerender({ dep: 1 });
    await flushStickFrame();
    await vi.waitFor(() => {
      expect(inner.scrollTop).toBe(100);
    });
    expect(outer.scrollTop).toBe(0);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
