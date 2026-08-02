import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

/** Cheap publish signature for measuring preview polygons (avoids JSON.stringify). */
export function previewGeometryFingerprint(
  feature: Feature<Polygon | MultiPolygon> | null,
): string | null {
  if (!feature) {
    return null;
  }

  let coordCount = 0;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let first: Position | undefined;
  let last: Position | undefined;

  const visit = (position: Position) => {
    const lng = position[0];
    const lat = position[1];
    if (first === undefined) first = position;
    last = position;
    coordCount += 1;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  };

  const geometry = feature.geometry;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      for (const position of ring) visit(position);
    }
  } else {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const position of ring) visit(position);
      }
    }
  }

  if (coordCount === 0 || first === undefined || last === undefined) {
    return `${geometry.type}:0`;
  }

  const round = (value: number) => value.toFixed(6);

  return [
    geometry.type,
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
