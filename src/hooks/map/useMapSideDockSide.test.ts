import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  MAP_SIDE_DOCK_STORAGE_KEY,
  nearestMapSideDockAnchor,
  useMapSideDockSide,
  syncMapSideDockDataset,
} from "./useMapSideDockSide";

describe("nearestMapSideDockAnchor", () => {
  it("picks the closest side slot to the pointer", () => {
    expect(nearestMapSideDockAnchor(10, 10, 400, 800)).toBe("top-left");
    expect(nearestMapSideDockAnchor(10, 400, 400, 800)).toBe("mid-left");
    expect(nearestMapSideDockAnchor(390, 400, 400, 800)).toBe("mid-right");
    expect(nearestMapSideDockAnchor(390, 790, 400, 800)).toBe("bottom-right");
  });

  it("prefers top when the pointer is near the lowered top magnet", () => {
    expect(nearestMapSideDockAnchor(20, 120, 400, 800)).toBe("top-left");
    expect(nearestMapSideDockAnchor(20, 280, 400, 800)).toBe("mid-left");
  });
});

describe("useMapSideDockSide", () => {
  beforeEach(() => {
    localStorage.removeItem(MAP_SIDE_DOCK_STORAGE_KEY);
    delete document.documentElement.dataset.mapSideDock;
  });

  afterEach(() => {
    localStorage.removeItem(MAP_SIDE_DOCK_STORAGE_KEY);
    delete document.documentElement.dataset.mapSideDock;
  });

  it("defaults to bottom-right and writes the html dataset", () => {
    const { result } = renderHook(() => useMapSideDockSide());
    expect(result.current.anchor).toBe("bottom-right");
    expect(document.documentElement.dataset.mapSideDock).toBe("bottom-right");
  });

  it("migrates legacy left/right storage keys", () => {
    localStorage.setItem(MAP_SIDE_DOCK_STORAGE_KEY, "left");
    const { result } = renderHook(() => useMapSideDockSide());
    expect(result.current.anchor).toBe("bottom-left");
  });

  it("persists mid-left and updates the dataset", () => {
    const { result } = renderHook(() => useMapSideDockSide());
    act(() => {
      result.current.setAnchor("mid-left");
    });
    expect(result.current.anchor).toBe("mid-left");
    expect(localStorage.getItem(MAP_SIDE_DOCK_STORAGE_KEY)).toBe("mid-left");
    expect(document.documentElement.dataset.mapSideDock).toBe("mid-left");
  });

  it("syncMapSideDockDataset mirrors storage", () => {
    localStorage.setItem(MAP_SIDE_DOCK_STORAGE_KEY, "top-right");
    syncMapSideDockDataset();
    expect(document.documentElement.dataset.mapSideDock).toBe("top-right");
  });
});
