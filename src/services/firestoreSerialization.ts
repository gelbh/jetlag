import type { Feature, LineString, Point, Polygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../domain/annotations";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
} from "../domain/gameAreaBounds";

export interface FirestoreGameArea {
  south: number;
  west: number;
  north: number;
  east: number;
  geometryJson?: string;
}

type AnnotationGeometry = Feature<Point | LineString | Polygon>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFirestoreGameArea(value: unknown): value is FirestoreGameArea {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record.south) &&
    isFiniteNumber(record.west) &&
    isFiniteNumber(record.north) &&
    isFiniteNumber(record.east)
  );
}

export function serializeGameAreaForFirestore(
  gameArea: GameArea,
): FirestoreGameArea {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);

  return {
    south,
    west,
    north,
    east,
    geometryJson: JSON.stringify(gameArea),
  };
}

export function deserializeGameAreaFromFirestore(value: unknown): GameArea {
  if (isFirestoreGameArea(value)) {
    if (typeof value.geometryJson === "string") {
      return JSON.parse(value.geometryJson) as GameArea;
    }

    return boundingBoxToGameArea(value);
  }

  if (
    value &&
    typeof value === "object" &&
    ((value as GameArea).type === "Polygon" ||
      (value as GameArea).type === "MultiPolygon") &&
    Array.isArray((value as GameArea).coordinates)
  ) {
    return value as GameArea;
  }

  throw new Error("Session game area is missing or invalid.");
}

function stripUndefinedValues(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedValues(item))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = stripUndefinedValues(child);
    if (next !== undefined) {
      sanitized[key] = next;
    }
  }

  return sanitized;
}

export function serializeAnnotationForFirestore(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  return {
    type: annotation.type,
    geometryJson: JSON.stringify(annotation.geometry),
    metadata: stripUndefinedValues(annotation.metadata),
    status: annotation.status,
  };
}

function deserializeFirestoreTimestamp(value: unknown): string | undefined {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

export function deserializeAnnotationFromFirestore(
  sessionId: string,
  annotationId: string,
  data: Record<string, unknown>,
): AnnotationRecord {
  const geometry = deserializeAnnotationGeometry(data);
  if (!geometry) {
    throw new Error(`Annotation ${annotationId} is missing geometry.`);
  }

  return {
    id: annotationId,
    sessionId,
    type: data.type as AnnotationRecord["type"],
    geometry,
    metadata: data.metadata as AnnotationRecord["metadata"],
    status: data.status as AnnotationRecord["status"],
    updatedAt: deserializeFirestoreTimestamp(data.updatedAt),
  };
}

function deserializeAnnotationGeometry(
  data: Record<string, unknown>,
): AnnotationGeometry | null {
  if (typeof data.geometryJson === "string") {
    return JSON.parse(data.geometryJson) as AnnotationGeometry;
  }

  if (data.geometry && typeof data.geometry === "object") {
    return data.geometry as AnnotationGeometry;
  }

  return null;
}

export function assertNoNestedArrays(value: unknown, path = "document"): void {
  if (Array.isArray(value)) {
    if (value.some(Array.isArray)) {
      throw new Error(`Firestore payload contains nested arrays at ${path}.`);
    }

    value.forEach((item, index) => {
      assertNoNestedArrays(item, `${path}[${index}]`);
    });
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertNoNestedArrays(child, `${path}.${key}`);
  }
}

export function buildSessionDocument(
  code: string,
  gameArea: GameArea,
  hostUid: string,
  createdAt: string,
  transitMetroId?: string,
): Record<string, unknown> {
  const payload = {
    code,
    gameArea: serializeGameAreaForFirestore(gameArea),
    hostUid,
    createdAt,
    memberUids: [hostUid],
    transitMetroId: transitMetroId ?? null,
  };

  assertNoNestedArrays(payload);
  return payload;
}

export function buildAnnotationDocument(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  const payload = serializeAnnotationForFirestore(annotation);
  assertNoNestedArrays(payload);
  return payload;
}
