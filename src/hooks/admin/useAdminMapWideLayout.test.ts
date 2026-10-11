import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminMapWideLayout } from "./useAdminMapWideLayout";

describe("useAdminMapWideLayout", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("768px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("returns true for full-screen when viewport is wide", () => {
    const shellRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useAdminMapWideLayout(shellRef));

    expect(result.current).toBe(true);
  });

  it("returns false for embedded monitor when only viewport is wide", () => {
    const shellRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useAdminMapWideLayout(shellRef, { embedded: true }));

    expect(result.current).toBe(false);
  });

  function stubContainerWidth(width: number) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        private readonly callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }
        observe() {
          this.callback(
            [{ contentRect: { width } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        }
        disconnect() {}
      },
    );
  }

  it("returns true for embedded monitor when the container is 560px wide", () => {
    stubContainerWidth(560);
    const shellRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useAdminMapWideLayout(shellRef, { embedded: true }));

    expect(result.current).toBe(true);
  });

  it("returns false for full-screen at a 560px container with a narrow viewport", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    stubContainerWidth(560);
    const shellRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useAdminMapWideLayout(shellRef));

    expect(result.current).toBe(false);
  });

  it("reattaches container measurement when ready becomes true", () => {
    const shellRef = createRef<HTMLDivElement>();
    const observe = vi.fn();
    const disconnect = vi.fn();

    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = disconnect;
      },
    );

    const { rerender } = renderHook(
      ({ ready }) => useAdminMapWideLayout(shellRef, { embedded: true, ready }),
      { initialProps: { ready: false } },
    );

    shellRef.current = document.createElement("div");

    rerender({ ready: true });

    expect(observe).toHaveBeenCalledWith(shellRef.current);
  });
});
