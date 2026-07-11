import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";

export function ringToLineString(ring: number[][]): Feature<LineString> | null {
  if (ring.length < 2) {
    return null;
  }

  const closed =
    ring[0]?.[0] === ring[ring.length - 1]?.[0] &&
    ring[0]?.[1] === ring[ring.length - 1]?.[1];
  const coordinates = closed ? ring : [...ring, ring[0]!];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

export function polygonRingsToLineStrings(
  geometry: Polygon | MultiPolygon,
): Feature<LineString>[] {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  const segments: Feature<LineString>[] = [];
  for (const polygonCoords of polygons) {
    const outerRing = polygonCoords[0];
    if (!outerRing) {
      continue;
    }
    const segment = ringToLineString(outerRing);
    if (segment) {
      segments.push(segment);
    }
  }
  return segments;
}

export function polygonOuterRingToLineString(
  polygon: Feature<Polygon>,
): Feature<LineString> | null {
  const ring = polygon.geometry.coordinates[0];
  if (!ring || ring.length < 2) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: ring,
    },
  };
}
