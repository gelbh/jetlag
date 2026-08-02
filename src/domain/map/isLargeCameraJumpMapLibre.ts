import type { LngLatLike, Map as MapLibreMap } from "maplibre-gl";
import {
  MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION,
  MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA,
} from "../device/motion/motionTokens";

/** MapLibre equivalent of {@link isLargeCameraJump} (same thresholds). */
export function isLargeCameraJumpMapLibre(
  map: MapLibreMap,
  targetCenter: LngLatLike,
  targetZoom: number,
  preferFly: boolean,
): boolean {
  if (preferFly) {
    return true;
  }

  if (Math.abs(targetZoom - map.getZoom()) >= MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA) {
    return true;
  }

  const canvas = map.getCanvas();
  const viewportSpanPx = Math.max(canvas.clientWidth, canvas.clientHeight);
  if (viewportSpanPx <= 0) {
    return false;
  }

  const from = map.project(map.getCenter());
  const to = map.project(targetCenter);
  const centerDeltaPx = Math.hypot(to.x - from.x, to.y - from.y);

  return centerDeltaPx / viewportSpanPx >= MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION;
}
