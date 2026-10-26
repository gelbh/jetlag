import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  resetAskMapPlacementStoreForTests,
  setAskMapPlacementActive,
} from "./askMapPlacementStore";
import { useAskMapPlacementActive } from "./useAskMapPlacementActive";

afterEach(() => {
  resetAskMapPlacementStoreForTests();
});

describe("useAskMapPlacementActive", () => {
  it("is false by default without a DOM attribute", () => {
    const { result } = renderHook(() => useAskMapPlacementActive());

    expect(result.current).toBe(false);
    expect(document.documentElement.hasAttribute("data-ask-map-placement")).toBe(false);
  });

  it("becomes true after setAskMapPlacementActive(true) without a DOM attribute", () => {
    const { result } = renderHook(() => useAskMapPlacementActive());

    act(() => {
      setAskMapPlacementActive(true);
    });

    expect(result.current).toBe(true);
    expect(document.documentElement.hasAttribute("data-ask-map-placement")).toBe(false);
  });

  it("returns false after test reset", () => {
    const { result } = renderHook(() => useAskMapPlacementActive());

    act(() => {
      setAskMapPlacementActive(true);
    });
    act(() => {
      resetAskMapPlacementStoreForTests();
    });

    expect(result.current).toBe(false);
  });
});
