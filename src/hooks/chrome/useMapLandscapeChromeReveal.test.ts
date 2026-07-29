import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LANDSCAPE_MAP_DOMINANT_MEDIA } from "../layout/useLandscapeMapDominant";
import { useMapLandscapeChromeReveal } from "./useMapLandscapeChromeReveal";

function mockMatchMedia(initialMatches: boolean) {
  let currentMatches = initialMatches;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === LANDSCAPE_MAP_DOMINANT_MEDIA ? currentMatches : false;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  }));
  return {
    setMatches(next: boolean) {
      currentMatches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useMapLandscapeChromeReveal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to collapsed mode in landscape", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMapLandscapeChromeReveal());

    expect(result.current.mode).toBe("collapsed");
    expect(result.current.collapsed).toBe(true);
    expect(result.current.active).toBe(true);
  });

  it("reveals chrome when toggled", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMapLandscapeChromeReveal());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.mode).toBe("revealed");
    expect(result.current.collapsed).toBe(false);
  });

  it("resets to portrait mode when leaving landscape", () => {
    const media = mockMatchMedia(true);
    const { result } = renderHook(() => useMapLandscapeChromeReveal());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe("revealed");

    act(() => {
      media.setMatches(false);
    });

    expect(result.current.mode).toBe("portrait");
    expect(result.current.active).toBe(false);
  });
});
