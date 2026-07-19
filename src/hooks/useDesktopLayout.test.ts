import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesktopLayout } from "./useDesktopLayout";

describe("useDesktopLayout", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("1024px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("is true when viewport matches min-width 1024px", () => {
    const { result } = renderHook(() => useDesktopLayout());
    expect(result.current).toBe(true);
  });

  it("is false when viewport is below 1024px", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useDesktopLayout());
    expect(result.current).toBe(false);
  });
});
