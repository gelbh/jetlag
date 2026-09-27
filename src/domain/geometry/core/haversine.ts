import type { LatLngTuple } from "./types";

/** Cheap local haversine (R = 6_371_000). Prefer for hot paths / thresholds.
 *  Game / Turf distances use `distanceBetween*` (Turf earthRadius 6371008.8).
 *  Do not merge the two without a dedicated prove band (cross-domain callers). */
export function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const earthRadius = 6_371_000;
  const latDelta = ((b[0] - a[0]) * Math.PI) / 180;
  const lngDelta = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}
