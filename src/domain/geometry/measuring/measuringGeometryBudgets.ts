import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import {
  isMeasuringLinearLocation,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../questions/measuringQuestions";
import { persistSlimPolygonFeature } from "../progressive/persistSlim";
import {
  POLYGON_PERSIST_MAX_JSON_CHARS,
  POLYGON_PERSIST_MAX_VERTICES,
  countPolygonVertices as countProgressivePolygonVertices,
  polygonGeometryJsonChars,
} from "../progressive/polygonMetrics";

/** Max places when measuring every site in the play area (HADK parks = 107). */
export const MEASURING_MULTI_PLACE_MAX = 128;

/** Max vertices across prepared linear segments (coast / LEA / borders). */
export const MEASURING_LINEAR_MAX_VERTICES = 12_000;

/**
 * Max vertices on any elim GeoJSON write after persist-slim (Firestore ceiling).
 * Locked between museum-scale (~1.3k OK) and RLBT golf closer (~8k fatal).
 */
export const MEASURING_OUTPUT_MAX_VERTICES = POLYGON_PERSIST_MAX_VERTICES;

/**
 * Max UTF-16 length of JSON.stringify(geometry) after persist-slim.
 * Locked between museum-scale (~50 KB OK) and RLBT golf closer (~320 KB fatal).
 * Applies to any elim GeoJSON write, not measuring-only.
 */
export const MEASURING_OUTPUT_MAX_JSON_CHARS = POLYGON_PERSIST_MAX_JSON_CHARS;

export const MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE =
  "Too many places in this play area to measure safely. Pick one place or use a smaller play area.";

export const MEASURING_LINEAR_OVER_BUDGET_MESSAGE =
  "Those borders are too detailed for this play area. Try a smaller area or another category.";

/** @deprecated Preview no longer refuses; persist uses MEASURING_PERSIST_OVER_BUDGET_MESSAGE. */
export const MEASURING_OUTPUT_OVER_BUDGET_MESSAGE =
  "This measure is too complex for this play area. Try a shorter distance or a smaller area.";

/** Persist soft-fail — storage ceiling, not play-area complexity. */
export const MEASURING_PERSIST_OVER_BUDGET_MESSAGE =
  "Couldn't save this measure — geometry is too large to store. Try a shorter distance.";

export type MeasuringBudgetResult =
  | { ok: true }
  | { ok: false; message: string };

export type MeasuringOutputSoftenResult =
  | { ok: true; feature: Feature<Polygon | MultiPolygon> }
  | { ok: false; message: string };

export function assertMeasuringMultiPlaceBudget(
  count: number,
): MeasuringBudgetResult {
  if (count > MEASURING_MULTI_PLACE_MAX) {
    return { ok: false, message: MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE };
  }
  return { ok: true };
}

export function assertMeasuringLinearVertexBudget(
  totalVertices: number,
): MeasuringBudgetResult {
  if (totalVertices > MEASURING_LINEAR_MAX_VERTICES) {
    return { ok: false, message: MEASURING_LINEAR_OVER_BUDGET_MESSAGE };
  }
  return { ok: true };
}

export function countLineStringVertices(
  segments: readonly Feature<LineString>[],
): number {
  let total = 0;
  for (const segment of segments) {
    total += segment.geometry.coordinates.length;
  }
  return total;
}

export const countPolygonVertices = countProgressivePolygonVertices;

export function measuringGeometryJsonChars(
  feature: Feature<Polygon | MultiPolygon>,
): number {
  return polygonGeometryJsonChars(feature);
}

export function assertMeasuringOutputComplexityBudget(
  input:
    | Feature<Polygon | MultiPolygon>
    | { vertexCount: number; jsonChars?: number }
    | { vertexCount?: number; jsonChars: number },
): MeasuringBudgetResult {
  if ("type" in input && input.type === "Feature") {
    const vertexCount = countPolygonVertices(input);
    const jsonChars = measuringGeometryJsonChars(input);
    if (
      vertexCount > MEASURING_OUTPUT_MAX_VERTICES ||
      jsonChars > MEASURING_OUTPUT_MAX_JSON_CHARS
    ) {
      return { ok: false, message: MEASURING_OUTPUT_OVER_BUDGET_MESSAGE };
    }
    return { ok: true };
  }

  const metrics = input as {
    vertexCount?: number;
    jsonChars?: number;
  };
  const vertexCount = metrics.vertexCount;
  const jsonChars = metrics.jsonChars;
  if (
    (typeof vertexCount === "number" &&
      vertexCount > MEASURING_OUTPUT_MAX_VERTICES) ||
    (typeof jsonChars === "number" && jsonChars > MEASURING_OUTPUT_MAX_JSON_CHARS)
  ) {
    return { ok: false, message: MEASURING_OUTPUT_OVER_BUDGET_MESSAGE };
  }
  return { ok: true };
}

/**
 * Persist path — slim toward Firestore ceiling; storage-oriented fail copy only.
 */
export function persistSlimMeasuringGeometry(
  feature: Feature<Polygon | MultiPolygon>,
): MeasuringOutputSoftenResult {
  const result = persistSlimPolygonFeature(feature);
  if (!result.ok) {
    return { ok: false, message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE };
  }
  return result;
}

/**
 * Persist-slim wrapper (legacy name). Prefer `persistSlimMeasuringGeometry`.
 */
export function softenMeasuringOutputToBudget(
  feature: Feature<Polygon | MultiPolygon>,
): MeasuringOutputSoftenResult {
  return persistSlimMeasuringGeometry(feature);
}

/** Preview/commit/resolve gate for multi-place and linear measuring. */
export function assertMeasuringGeometryBudget(input: {
  measuringSubject: MeasuringSubject;
  measuringLocationCategory: MeasuringLocationCategory | null;
  usesAllPlacesInArea: boolean;
  placeCount: number;
  linearSegments: readonly Feature<LineString>[];
}): MeasuringBudgetResult {
  if (input.usesAllPlacesInArea) {
    return assertMeasuringMultiPlaceBudget(input.placeCount);
  }

  if (
    input.measuringSubject === "coastline" ||
    isMeasuringLinearLocation(
      input.measuringSubject,
      input.measuringLocationCategory ?? undefined,
    )
  ) {
    return assertMeasuringLinearVertexBudget(
      countLineStringVertices(input.linearSegments),
    );
  }

  return { ok: true };
}
