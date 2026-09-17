import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  MAP_CHROME_DOCKS_STORAGE_KEY,
  MAP_SIDE_DOCK_STORAGE_KEY,
  resolveStackedTops,
} from "./mapChromeDockPlacement";
import { useMapSideDockSide } from "./useMapSideDockSide";
import { separateFromPeerRect } from "@/components/map/chrome/MapDraggableFixedStack";

describe("resolveStackedTops", () => {
  it("parks the mover above and pushes the peer down when needed", () => {
    const next = resolveStackedTops({
      moverTop: 100,
      moverHeight: 180,
      peerTop: 120,
      peerHeight: 200,
      preferAbove: true,
      viewportHeight: 800,
      gap: 14,
    });
    expect(next.moverTop + 180 + 14).toBeLessThanOrEqual(next.peerTop + 0.01);
    expect(next.moverTop).toBeGreaterThanOrEqual(8);
  });

  it("parks the mover below the peer", () => {
    const next = resolveStackedTops({
      moverTop: 300,
      moverHeight: 180,
      peerTop: 120,
      peerHeight: 200,
      preferAbove: false,
      viewportHeight: 800,
      gap: 14,
    });
    expect(next.moverTop).toBeGreaterThanOrEqual(120 + 200 + 14 - 0.01);
  });
});

describe("separateFromPeerRect", () => {
  it("parks above the peer when dragged on top from above", () => {
    const next = separateFromPeerRect(100, 40, 52, 80, {
      left: 100,
      top: 200,
      right: 152,
      bottom: 400,
      height: 200,
    });
    expect(next.top + 80).toBeLessThanOrEqual(200 - 14 + 0.01);
  });

  it("flips below when there is no room above the peer", () => {
    const next = separateFromPeerRect(100, 140, 52, 120, {
      left: 100,
      top: 200,
      right: 152,
      bottom: 400,
      height: 200,
    });
    expect(next.top).toBeGreaterThanOrEqual(200 + 200 + 14 - 0.01);
  });
});

describe("useMapSideDockSide", () => {
  beforeEach(() => {
    localStorage.removeItem(MAP_SIDE_DOCK_STORAGE_KEY);
    localStorage.removeItem(MAP_CHROME_DOCKS_STORAGE_KEY);
    delete document.documentElement.dataset.mapSideDock;
  });

  afterEach(() => {
    localStorage.removeItem(MAP_SIDE_DOCK_STORAGE_KEY);
    localStorage.removeItem(MAP_CHROME_DOCKS_STORAGE_KEY);
    delete document.documentElement.dataset.mapSideDock;
  });

  it("defaults to right side and writes the html dataset", () => {
    const { result } = renderHook(() => useMapSideDockSide());
    expect(result.current.placement.side).toBe("right");
    expect(document.documentElement.dataset.mapSideDock).toMatch(/right$/);
  });

  it("migrates legacy left/right storage keys", () => {
    localStorage.setItem(MAP_SIDE_DOCK_STORAGE_KEY, "left");
    const { result } = renderHook(() => useMapSideDockSide());
    expect(result.current.placement.side).toBe("left");
  });

  it("persists a continuous top ratio", () => {
    const { result } = renderHook(() => useMapSideDockSide());
    act(() => {
      result.current.setPlacement({ side: "left", topRatio: 0.35 });
    });
    expect(result.current.placement).toEqual({ side: "left", topRatio: 0.35 });
    expect(document.documentElement.dataset.mapSideDock).toMatch(/left$/);
  });
});
