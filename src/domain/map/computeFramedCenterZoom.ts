import type { LatLng, LatLngBounds, Map as LeafletMap, Point } from "leaflet";

/**
 * Mirrors Leaflet's private `Map._getBoundsCenterZoom` using only public APIs.
 * Needed so we can clamp zoom to a placement-specific min/max *before* deriving
 * the center — asymmetric padding shifts the center, not just the zoom, so
 * recomputing at the final clamped zoom keeps geometry framed above the panel
 * instead of the two-step fit-then-clamp jump this replaces.
 */
export function computeFramedCenterZoom(
  map: LeafletMap,
  bounds: LatLngBounds,
  paddingTopLeft: Point,
  paddingBottomRight: Point,
  minZoom?: number,
  maxZoom?: number,
): { center: LatLng; zoom: number } {
  let zoom = map.getBoundsZoom(
    bounds,
    false,
    paddingTopLeft.add(paddingBottomRight),
  );
  if (typeof maxZoom === "number") {
    zoom = Math.min(maxZoom, zoom);
  }
  if (typeof minZoom === "number") {
    zoom = Math.max(minZoom, zoom);
  }

  if (zoom === Infinity) {
    return { center: bounds.getCenter(), zoom };
  }

  const paddingOffset = paddingBottomRight.subtract(paddingTopLeft).divideBy(2);
  const swPoint = map.project(bounds.getSouthWest(), zoom);
  const nePoint = map.project(bounds.getNorthEast(), zoom);
  const center = map.unproject(
    swPoint.add(nePoint).divideBy(2).add(paddingOffset),
    zoom,
  );

  return { center, zoom };
}
