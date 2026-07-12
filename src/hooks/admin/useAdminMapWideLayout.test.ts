import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRef } from "react";
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
    const { result } = renderHook(() =>
      useAdminMapWideLayout(shellRef, { embedded: true }),
    );

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
