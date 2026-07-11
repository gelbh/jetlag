import type { LatLngTuple } from "./geometryCore";
import turfDistance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";

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

export function distanceBetweenLatLngPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return turfDistance(turfPoint([from[1], from[0]]), turfPoint([to[1], to[0]]), {
    units: "meters",
  });
}
