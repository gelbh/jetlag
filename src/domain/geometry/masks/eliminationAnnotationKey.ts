import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { AnnotationRecord } from "../../map/annotations";

export type EliminationAddOnlyResult = { addOnly: true; newIds: string[] } | { addOnly: false };

const ENTRY_SEPARATOR = "|";

function roundCoord(value: number): string {
  return value.toFixed(6);
}

/** Full coordinate identity for mask cache / add-only (lossy preview fingerprints are not safe here). */
function polygonFeatureIdentity(feature: Feature<Polygon | MultiPolygon>): string {
  return `${feature.geometry.type}:${JSON.stringify(feature.geometry.coordinates)}`;
}

function lineStringFingerprint(coordinates: Position[]): string {
  return `LineString:${JSON.stringify(coordinates)}`;
}

function polygonJsonFingerprint(json: string | undefined): string {
  if (!json) {
    return "";
  }
  return `json:${json}`;
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
    geometryKey = polygonFeatureIdentity(annotation.geometry as Feature<Polygon | MultiPolygon>);
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
export function eliminationAnnotationsContentKey(annotations: readonly AnnotationRecord[]): string {
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
