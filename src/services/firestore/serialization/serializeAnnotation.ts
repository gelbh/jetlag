import type { Feature, LineString, Point, Polygon } from "geojson";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import { parseFirestoreDocument } from "../zodConverter";
import { annotationDocumentSchema } from "../schemas/firestoreDocuments";
import { assertNoNestedArrays, stripUndefinedValues } from "./shared";

type AnnotationGeometry = Feature<Point | LineString | Polygon>;

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

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const record = value as { seconds: number; nanoseconds?: number };
    const seconds = record.seconds;
    const nanoseconds = record.nanoseconds ?? 0;

    return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString();
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
  const document = parseFirestoreDocument(
    annotationDocumentSchema,
    data,
    `annotation ${annotationId}`,
  );
  const geometry = deserializeAnnotationGeometry(document);
  if (!geometry) {
    throw new Error(`Annotation ${annotationId} is missing geometry.`);
  }

  return {
    id: annotationId,
    sessionId,
    type: document.type as AnnotationRecord["type"],
    geometry,
    metadata: document.metadata as AnnotationRecord["metadata"],
    status: document.status as AnnotationRecord["status"],
    updatedAt: deserializeFirestoreTimestamp(document.updatedAt),
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

export function buildAnnotationDocument(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  const payload = serializeAnnotationForFirestore(annotation);
  assertNoNestedArrays(payload);
  return payload;
}
