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

function polygonJsonFingerprint(json: string | undefined): string {
  if (!json) {
    return "";
  }
  try {
    const parsed = JSON.parse(json) as Feature<Polygon | MultiPolygon>;
    if (
      parsed?.type === "Feature" &&
      (parsed.geometry?.type === "Polygon" || parsed.geometry?.type === "MultiPolygon")
    ) {
      return previewGeometryFingerprint(parsed) ?? "null";
    }
  } catch {
    // fall through to raw digest
  }
  return `raw:${json.length}:${json.slice(0, 24)}:${json.slice(-24)}`;
}

/** Mask-shaping metadata that can change elimination without moving Feature geometry. */
function maskShapingMetadataFingerprint(annotation: AnnotationRecord): string {
  const metadata = annotation.metadata;
  switch (annotation.type) {
    case "radar":
      return [
        "radar",
        metadata.inside === true ? "1" : metadata.inside === false ? "0" : "u",
        metadata.radiusMeters ?? "",
      ].join(":");
    case "tentacle":
      return [
        "tentacle",
        metadata.tentacleOutOfReach ? "1" : "0",
        metadata.tentacleAnswerRadiusMeters ?? "",
        metadata.radiusMeters ?? "",
        polygonJsonFingerprint(metadata.tentacleEliminationJson),
      ].join(":");
    case "measuring":
      return [
        "measuring",
        metadata.measuringAnswer ?? "",
        metadata.measuringRegionInputJson ?? "",
        metadata.measuringPlacesJson ?? "",
      ].join(":");
    case "thermometer":
      return ["thermometer", metadata.thermometerAnswer ?? ""].join(":");
    case "matching":
    case "zone":
    case "pin":
    case "draw":
      return "";
    default: {
      const _exhaustive: never = annotation.type;
      return _exhaustive;
    }
  }
}

function annotationGeometryFingerprint(annotation: AnnotationRecord): string {
  const geometry = annotation.geometry.geometry;
  let geometryKey: string;
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    geometryKey =
      previewGeometryFingerprint(annotation.geometry as Feature<Polygon | MultiPolygon>) ?? "null";
  } else if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    geometryKey = `Point:${roundCoord(lng)}:${roundCoord(lat)}`;
  } else {
    geometryKey = lineStringFingerprint(geometry.coordinates);
  }

  const metadataKey = maskShapingMetadataFingerprint(annotation);
  return metadataKey ? `${geometryKey}@${metadataKey}` : geometryKey;
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

/**
 * Stable content key for committed annotations used by elimination mask delta.
 * Includes Feature geometry plus mask-shaping metadata (radar / tentacle / measuring / thermometer).
 * Pass the same active annotation set the mask path uses.
 */
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
