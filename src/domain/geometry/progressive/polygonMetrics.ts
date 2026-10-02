import type { Feature, MultiPolygon, Polygon } from "geojson";

/** Max vertices on any elim GeoJSON write (Firestore ceiling). */
export const POLYGON_PERSIST_MAX_VERTICES = 4_000;

/** Max UTF-16 length of JSON.stringify(geometry) on any elim write. */
export const POLYGON_PERSIST_MAX_JSON_CHARS = 120_000;

/** Persist soft-fail: storage ceiling, not play-area complexity. */
export const POLYGON_PERSIST_OVER_BUDGET_MESSAGE =
  "Couldn't save this shade — geometry is too large to store.";

export type PolygonPersistBudgetResult = { ok: true } | { ok: false; message: string };

/** Count ring vertices without spread (Dublin-scale safe). */
export function countPolygonVertices(feature: Feature<Polygon | MultiPolygon>): number {
  let total = 0;
  const { geometry } = feature;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      total += ring.length;
    }
    return total;
  }
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      total += ring.length;
    }
  }
  return total;
}

export function polygonGeometryJsonChars(feature: Feature<Polygon | MultiPolygon>): number {
  return JSON.stringify(feature.geometry).length;
}

export function assertPolygonPersistBudget(
  feature: Feature<Polygon | MultiPolygon>,
): PolygonPersistBudgetResult {
  const vertexCount = countPolygonVertices(feature);
  const jsonChars = polygonGeometryJsonChars(feature);
  if (vertexCount > POLYGON_PERSIST_MAX_VERTICES || jsonChars > POLYGON_PERSIST_MAX_JSON_CHARS) {
    return { ok: false, message: POLYGON_PERSIST_OVER_BUDGET_MESSAGE };
  }
  return { ok: true };
}
