import type { LatLng, Map as LeafletMap } from "leaflet";
import {
  MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION,
  MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA,
} from "../device/motionTokens";

/** Large reframes (phase changes, answers, Recenter) read better as a cinematic
 * `flyTo`; small edits stay a short `setView` so walk/POI updates don't lag. */
export function isLargeCameraJump(
  map: LeafletMap,
  targetCenter: LatLng,
  targetZoom: number,
  preferFly: boolean,
): boolean {
  if (preferFly) {
    return true;
  }

  if (Math.abs(targetZoom - map.getZoom()) >= MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA) {
    return true;
  }

  const size = map.getSize();
  const viewportSpanPx = Math.max(size.x, size.y);
  if (viewportSpanPx <= 0) {
    return false;
  }

  const centerDeltaPx = map
    .latLngToContainerPoint(map.getCenter())
    .distanceTo(map.latLngToContainerPoint(targetCenter));

  return centerDeltaPx / viewportSpanPx >= MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION;
}
