import { renderHook, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRowInView } from "./useRowInView";

describe("useRowInView", () => {
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let callback: IntersectionObserverCallback;

  beforeEach(() => {
    observe = vi.fn();
    disconnect = vi.fn();
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports intersecting when observer fires", async () => {
    const ref = createRef<HTMLElement>();
    const node = document.createElement("div");
    Object.defineProperty(ref, "current", { value: node, writable: true });

    const { result } = renderHook(() => useRowInView(ref));
    expect(result.current).toBe(false);
    expect(observe).toHaveBeenCalledWith(node);

    callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("returns false when ref has no element", () => {
    const ref = createRef<HTMLElement>();
    const { result } = renderHook(() => useRowInView(ref));
    expect(result.current).toBe(false);
    expect(observe).not.toHaveBeenCalled();
  });

  it("rebinds when observeKey changes after mount", async () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = renderHook(
      ({ key }: { key: string | null }) => useRowInView(ref, key),
      { initialProps: { key: null as string | null } },
    );

    expect(observe).not.toHaveBeenCalled();

    const node = document.createElement("div");
    Object.defineProperty(ref, "current", { value: node, writable: true });
    rerender({ key: "me" });

    await waitFor(() => {
      expect(observe).toHaveBeenCalledWith(node);
    });
  });
});
