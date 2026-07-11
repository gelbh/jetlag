import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngBounds } from "leaflet";
import difference from "@turf/difference";
import type { LatLngTuple } from "./types";

function geodesicMeters(a: LatLngTuple, b: LatLngTuple): number {
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

/** Geodesic distance from center to the nearest viewport edge. */
export function centerToViewportEdgeRadiusMeters(
  center: LatLngTuple,
  bounds: LatLngBounds,
): number {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const south = southWest.lat;
  const west = southWest.lng;
  const north = northEast.lat;
  const east = northEast.lng;
  const [lat, lng] = center;

  return Math.min(
    geodesicMeters(center, [south, lng]),
    geodesicMeters(center, [north, lng]),
    geodesicMeters(center, [lat, west]),
    geodesicMeters(center, [lat, east]),
  );
}

export function midpoint(a: LatLngTuple, b: LatLngTuple): LatLngTuple {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function bearingDegrees(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function destinationPoint(
  origin: LatLngTuple,
  distanceMeters: number,
  bearing: number,
): LatLngTuple {
  const earthRadius = 6_371_000;
  const angularDistance = distanceMeters / earthRadius;
  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (origin[0] * Math.PI) / 180;
  const lng1 = (origin[1] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

export function safeDifference(
  outer: Feature<Polygon | MultiPolygon>,
  inner: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> | null {
  try {
    const result = difference({
      type: "FeatureCollection",
      features: [outer, inner],
    });
    if (
      !result ||
      (result.geometry.type !== "Polygon" &&
        result.geometry.type !== "MultiPolygon")
    ) {
      return null;
    }

    return result as Feature<Polygon | MultiPolygon>;
  } catch {
    return null;
  }
}
