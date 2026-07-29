import type { GameArea } from "../../../domain/map/annotations";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
} from "../../../domain/geometry/gameArea/gameAreaBounds";
import { parseFirestoreDocument } from "../zodConverter";
import { firestoreGameAreaSchema } from "../schemas/firestoreDocuments";

export interface FirestoreGameArea {
  south: number;
  west: number;
  north: number;
  east: number;
  geometryJson?: string;
}

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
    parseFirestoreDocument(firestoreGameAreaSchema, value, "game area");
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

export function stripUndefinedValues(value: unknown): unknown {
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
