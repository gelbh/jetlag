import { afterEach, describe, expect, it, vi } from "vitest";
import { map as createMap, point, type LatLng, type Map as LeafletMap } from "leaflet";
import { isLargeCameraJump } from "./isLargeCameraJump";
import {
  MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION,
  MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA,
} from "../device/motionTokens";

const VIEWPORT_WIDTH_PX = 800;
const VIEWPORT_HEIGHT_PX = 600;

/** jsdom has no layout engine, so `offsetWidth`/`offsetHeight` (and thus
 * Leaflet's `getSize`) always read 0. Stub `getSize` directly so the
 * pixel-based thresholds in `isLargeCameraJump` have a real viewport to
 * measure against. */
function createSizedMap(): { container: HTMLDivElement; map: LeafletMap } {
  const container = document.createElement("div");
  container.style.width = `${VIEWPORT_WIDTH_PX}px`;
  container.style.height = `${VIEWPORT_HEIGHT_PX}px`;
  document.body.appendChild(container);
  const map = createMap(container, { center: [53.34, -6.26], zoom: 12 });
  // `mockImplementation` (not `mockReturnValue`) so every call gets a fresh
  // `Point` — Leaflet's internals mutate the size in place (e.g. `_divideBy`)
  // and a shared instance would corrupt itself after the first read.
  vi.spyOn(map, "getSize").mockImplementation(() =>
    point(VIEWPORT_WIDTH_PX, VIEWPORT_HEIGHT_PX),
  );
  map.invalidateSize();
  return { container, map };
}

function targetAtPixelOffset(map: LeafletMap, dx: number, dy: number): LatLng {
  const centerPoint = map.latLngToContainerPoint(map.getCenter());
  return map.containerPointToLatLng(centerPoint.add(point(dx, dy)));
}

describe("isLargeCameraJump", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  function setup(): LeafletMap {
    const { container, map } = createSizedMap();
    cleanups.push(() => {
      map.remove();
      container.remove();
    });
    return map;
  }

  it("overrides a negligible geometry delta when preferFly is set", () => {
    const map = setup();
    const target = targetAtPixelOffset(map, 1, 0);

    expect(isLargeCameraJump(map, target, map.getZoom(), false)).toBe(false);
    expect(isLargeCameraJump(map, target, map.getZoom(), true)).toBe(true);
  });

  it("flags a large jump once the zoom delta reaches its threshold", () => {
    const map = setup();
    const target = map.getCenter();
    const belowThreshold =
      map.getZoom() + MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA - 0.1;
    const atThreshold = map.getZoom() + MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA;

    expect(isLargeCameraJump(map, target, belowThreshold, false)).toBe(false);
    expect(isLargeCameraJump(map, target, atThreshold, false)).toBe(true);
  });

  it("flags a large jump once the center movement reaches the viewport-fraction threshold", () => {
    const map = setup();
    const viewportSpanPx = Math.max(map.getSize().x, map.getSize().y);
    const thresholdPx = viewportSpanPx * MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION;

    const belowThreshold = targetAtPixelOffset(map, thresholdPx - 30, 0);
    const atThreshold = targetAtPixelOffset(map, thresholdPx + 20, 0);

    expect(isLargeCameraJump(map, belowThreshold, map.getZoom(), false)).toBe(
      false,
    );
    expect(isLargeCameraJump(map, atThreshold, map.getZoom(), false)).toBe(
      true,
    );
  });
});
