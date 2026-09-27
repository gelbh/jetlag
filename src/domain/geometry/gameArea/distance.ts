import type { LatLngTuple } from "../core/types";
import turfDistance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";

export { haversineMeters } from "../core/haversine";

export function distanceBetweenLatLngPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return turfDistance(turfPoint([from[1], from[0]]), turfPoint([to[1], to[0]]), {
    units: "meters",
  });
}

/** Turf geodesic meters; alias kept for call sites that say distanceBetweenPoints. */
export function distanceBetweenPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return distanceBetweenLatLngPoints(from, to);
}
