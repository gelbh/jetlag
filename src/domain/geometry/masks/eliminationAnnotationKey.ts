import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { AnnotationRecord } from "../../map/annotations";
import { previewGeometryFingerprint } from "../measuring/previewGeometryFingerprint";

export type EliminationAddOnlyResult =
  | { addOnly: true; newIds: string[] }
  | { addOnly: false };

const ENTRY_SEPARATOR = "|";

function roundCoord(value: number): string {
  return value.toFixed(6);
}

function lineStringFingerprint(coordinates: Position[]): string {
  if (coordinates.length === 0) {
    return "LineString:0";
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const position of coordinates) {
    const lng = position[0];
    const lat = position[1];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return [
    "LineString",
    roundCoord(minLng),
    roundCoord(minLat),
    roundCoord(maxLng),
    roundCoord(maxLat),
    coordinates.length,
    roundCoord(first[0]),
    roundCoord(first[1]),
    roundCoord(last[0]),
    roundCoord(last[1]),
  ].join(":");
}

function annotationGeometryFingerprint(annotation: AnnotationRecord): string {
  const geometry = annotation.geometry.geometry;
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return (
      previewGeometryFingerprint(annotation.geometry as Feature<Polygon | MultiPolygon>) ?? "null"
    );
  }
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    return `Point:${roundCoord(lng)}:${roundCoord(lat)}`;
  }
  return lineStringFingerprint(geometry.coordinates);
}

function parseContentKey(key: string): Map<string, string> {
  const entries = new Map<string, string>();
  if (!key) {
    return entries;
  }

  for (const entry of key.split(ENTRY_SEPARATOR)) {
    if (!entry) {
      continue;
    }
    const colon = entry.indexOf(":");
    if (colon <= 0) {
      continue;
    }
    entries.set(entry.slice(0, colon), entry.slice(colon + 1));
  }
  return entries;
}

/** Stable content key for committed annotation geometries used by elimination mask delta. */
export function eliminationAnnotationsContentKey(
  annotations: readonly AnnotationRecord[],
): string {
  return annotations
    .filter((annotation) => annotation.status === "active")
    .map((annotation) => `${annotation.id}:${annotationGeometryFingerprint(annotation)}`)
    .sort()
    .join(ENTRY_SEPARATOR);
}

/**
 * True when every prior id remains with the same geometry fingerprint and one or more new ids
 * were added. Empty prior key is never add-only (first build).
 */
export function isAddOnly(
  prevKey: string,
  nextAnnotations: readonly AnnotationRecord[],
): EliminationAddOnlyResult {
  if (!prevKey) {
    return { addOnly: false };
  }

  const prevEntries = parseContentKey(prevKey);
  if (prevEntries.size === 0) {
    return { addOnly: false };
  }

  const nextEntries = parseContentKey(eliminationAnnotationsContentKey(nextAnnotations));
  if (nextEntries.size <= prevEntries.size) {
    return { addOnly: false };
  }

  for (const [id, fingerprint] of prevEntries) {
    if (nextEntries.get(id) !== fingerprint) {
      return { addOnly: false };
    }
  }

  const newIds: string[] = [];
  for (const id of nextEntries.keys()) {
    if (!prevEntries.has(id)) {
      newIds.push(id);
    }
  }

  if (newIds.length === 0) {
    return { addOnly: false };
  }

  newIds.sort();
  return { addOnly: true, newIds };
}
