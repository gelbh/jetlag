import { afterEach, describe, expect, it, vi } from "vitest";
import type { LngLatLike, Map as MapLibreMap } from "maplibre-gl";
import { isLargeCameraJumpMapLibre } from "./isLargeCameraJumpMapLibre";
import {
  MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION,
  MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA,
} from "../device/motion/motionTokens";

const VIEWPORT_WIDTH_PX = 800;
const VIEWPORT_HEIGHT_PX = 600;

function lngLatParts(c: LngLatLike): { lng: number; lat: number } {
  if (Array.isArray(c)) {
    return { lng: c[0], lat: c[1] };
  }
  if ("lon" in c) {
    return { lng: c.lon, lat: c.lat };
  }
  return { lng: c.lng, lat: c.lat };
}

function createStubMap(center: { lng: number; lat: number }, zoom: number) {
  const projected = new Map<string, { x: number; y: number }>();
  const key = (c: LngLatLike) => {
    const { lng, lat } = lngLatParts(c);
    return `${lng},${lat}`;
  };
  projected.set(key(center), { x: VIEWPORT_WIDTH_PX / 2, y: VIEWPORT_HEIGHT_PX / 2 });

  const map = {
    getZoom: () => zoom,
    getCenter: () => center,
    getCanvas: () => ({
      clientWidth: VIEWPORT_WIDTH_PX,
      clientHeight: VIEWPORT_HEIGHT_PX,
    }),
    project: (lngLat: LngLatLike) => {
      const hit = projected.get(key(lngLat));
      if (hit) {
        return hit;
      }
      // Approximate: 1° lng ≈ viewport width at this stub scale for delta tests
      const { lng, lat } = lngLatParts(lngLat);
      return {
        x: VIEWPORT_WIDTH_PX / 2 + (lng - center.lng) * VIEWPORT_WIDTH_PX,
        y: VIEWPORT_HEIGHT_PX / 2 + (center.lat - lat) * VIEWPORT_HEIGHT_PX,
      };
    },
  } as unknown as MapLibreMap;

  return { map, center };
}

describe("isLargeCameraJumpMapLibre", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("overrides a negligible geometry delta when preferFly is set", () => {
    const { map, center } = createStubMap({ lng: -6.26, lat: 53.34 }, 12);
    expect(isLargeCameraJumpMapLibre(map, center, 12, false)).toBe(false);
    expect(isLargeCameraJumpMapLibre(map, center, 12, true)).toBe(true);
  });

  it("flags a large jump once the zoom delta reaches its threshold", () => {
    const { map, center } = createStubMap({ lng: -6.26, lat: 53.34 }, 12);
    const below = 12 + MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA - 0.1;
    const at = 12 + MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA;
    expect(isLargeCameraJumpMapLibre(map, center, below, false)).toBe(false);
    expect(isLargeCameraJumpMapLibre(map, center, at, false)).toBe(true);
  });

  it("flags a large jump once the center movement reaches the viewport-fraction threshold", () => {
    const { map, center } = createStubMap({ lng: -6.26, lat: 53.34 }, 12);
    const viewportSpanPx = Math.max(VIEWPORT_WIDTH_PX, VIEWPORT_HEIGHT_PX);
    const thresholdPx = viewportSpanPx * MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION;
    // project stub: deltaLng * VIEWPORT_WIDTH_PX = pixel delta
    const belowLng = center.lng + (thresholdPx - 30) / VIEWPORT_WIDTH_PX;
    const atLng = center.lng + (thresholdPx + 20) / VIEWPORT_WIDTH_PX;

    expect(
      isLargeCameraJumpMapLibre(
        map,
        { lng: belowLng, lat: center.lat },
        12,
        false,
      ),
    ).toBe(false);
    expect(
      isLargeCameraJumpMapLibre(map, { lng: atLng, lat: center.lat }, 12, false),
    ).toBe(true);
  });
});
