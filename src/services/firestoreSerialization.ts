import type { Feature, LineString, Point, Polygon } from "geojson";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
  SessionTier,
} from "../domain/annotations";
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

function parseSessionTier(value: unknown): SessionTier {
  return value === "premium" ? "premium" : "free";
}

export function buildSessionDocument(
  code: string,
  gameArea: GameArea,
  hostUid: string,
  createdAt: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
): Record<string, unknown> {
  const payload = {
    code,
    gameArea: serializeGameAreaForFirestore(gameArea),
    hostUid,
    createdAt,
    memberUids: [hostUid],
    tier,
    transitMetroId: transitMetroId ?? null,
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
  };

  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeSessionFromFirestore(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  return {
    id,
    code: typeof data.code === "string" ? data.code : "",
    gameArea: deserializeGameAreaFromFirestore(
      data.gameArea as Parameters<typeof deserializeGameAreaFromFirestore>[0],
    ),
    hostUid: typeof data.hostUid === "string" ? data.hostUid : undefined,
    createdAt: String(data.createdAt),
    memberUids: Array.isArray(data.memberUids)
      ? data.memberUids.filter((uid): uid is string => typeof uid === "string")
      : [],
    tier: parseSessionTier(data.tier),
    transitMetroId:
      typeof data.transitMetroId === "string" ? data.transitMetroId : undefined,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : undefined,
    status:
      data.status === "active" || data.status === "ended"
        ? data.status
        : undefined,
    timerAccumulatedMs:
      typeof data.timerAccumulatedMs === "number"
        ? data.timerAccumulatedMs
        : undefined,
    timerRunningSince:
      data.timerRunningSince === null
        ? null
        : typeof data.timerRunningSince === "string"
          ? data.timerRunningSince
          : undefined,
  };
}

export function buildAnnotationDocument(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  const payload = serializeAnnotationForFirestore(annotation);
  assertNoNestedArrays(payload);
  return payload;
}
