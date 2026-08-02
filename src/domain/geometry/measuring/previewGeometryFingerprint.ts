import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

function collectPositions(geometry: Polygon | MultiPolygon): Position[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  return geometry.coordinates.flat(2);
}

/** Cheap publish signature for measuring preview polygons (avoids JSON.stringify). */
export function previewGeometryFingerprint(
  feature: Feature<Polygon | MultiPolygon> | null,
): string | null {
  if (!feature) {
    return null;
  }

  const positions = collectPositions(feature.geometry);
  const coordCount = positions.length;
  if (coordCount === 0) {
    return `${feature.geometry.type}:0`;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of positions) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const round = (value: number) => value.toFixed(6);
  const first = positions[0]!;
  const last = positions[coordCount - 1]!;

  return [
    feature.geometry.type,
    round(minLng),
    round(minLat),
    round(maxLng),
    round(maxLat),
    coordCount,
    round(first[0]),
    round(first[1]),
    round(last[0]),
    round(last[1]),
  ].join(":");
}
