import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { separateFromPeerRect } from "@/components/map/chrome/MapDraggableFixedStack";
import {
  MAP_CHROME_DOCKS_STORAGE_KEY,
  MAP_SIDE_DOCK_STORAGE_KEY,
  resolveStackedTops,
} from "./mapChromeDockPlacement";
import { useMapSideDockSide } from "./useMapSideDockSide";

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
    expect(next.moverTop).toBeGreaterThanOrEqual(72);
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
  it("keeps gap above the peer when dragged down into it", () => {
    const next = separateFromPeerRect(100, 160, 52, 80, {
      left: 100,
      top: 200,
      right: 152,
      bottom: 400,
      height: 200,
    });
    expect(next.top + 80).toBeLessThanOrEqual(200 - 14 + 0.01);
    expect(next.left).toBe(100);
  });

  it("keeps gap beside the peer when dragged sideways into it", () => {
    const next = separateFromPeerRect(120, 250, 52, 80, {
      left: 100,
      top: 200,
      right: 152,
      bottom: 400,
      height: 200,
    });
    const clearLeft = next.left + 52 <= 100 - 14 + 0.01;
    const clearRight = next.left >= 152 + 14 - 0.01;
    expect(clearLeft || clearRight).toBe(true);
  });

  it("does not horizontally snap to the peer when already clear", () => {
    const next = separateFromPeerRect(40, 40, 52, 80, {
      left: 100,
      top: 200,
      right: 152,
      bottom: 400,
      height: 200,
    });
    // Vertical clamp keeps stacks clear of status chrome (minTop = 72).
    expect(next).toEqual({ left: 40, top: 72 });
  });

  it("falls back below when left/right/above are clipped into the peer", () => {
    const prevWidth = window.innerWidth;
    const prevHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    const next = separateFromPeerRect(12, 30, 52, 160, {
      left: 12,
      top: 40,
      right: 108,
      bottom: 240,
      height: 200,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: prevWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: prevHeight,
    });
    expect(next.top).toBeGreaterThanOrEqual(240 + 14 - 0.01);
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
