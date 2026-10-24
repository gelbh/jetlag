import turfDistance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";
import type { LatLngTuple } from "../core/types";

export { haversineMeters } from "../core/haversine";

export function distanceBetweenLatLngPoints(from: LatLngTuple, to: LatLngTuple): number {
  return turfDistance(turfPoint([from[1], from[0]]), turfPoint([to[1], to[0]]), {
    units: "meters",
  });
}

export function distanceBetweenPoints(from: LatLngTuple, to: LatLngTuple): number {
  return distanceBetweenLatLngPoints(from, to);
}
