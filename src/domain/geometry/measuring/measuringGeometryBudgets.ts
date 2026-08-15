import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import simplify from "@turf/simplify";
import {
  isMeasuringLinearLocation,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../questions/measuringQuestions";

/** Max places when measuring every site in the play area (HADK parks = 107). */
export const MEASURING_MULTI_PLACE_MAX = 128;

/** Max vertices across prepared linear segments (coast / LEA / borders). */
export const MEASURING_LINEAR_MAX_VERTICES = 12_000;

/**
 * Max vertices on measuring near/elim after soften.
 * Locked between museum-scale (~1.3k OK) and RLBT golf closer (~8k fatal).
 */
export const MEASURING_OUTPUT_MAX_VERTICES = 4_000;

/**
 * Max UTF-16 length of JSON.stringify(geometry) after soften.
 * Locked between museum-scale (~50 KB OK) and RLBT golf closer (~320 KB fatal).
 */
export const MEASURING_OUTPUT_MAX_JSON_CHARS = 120_000;

export const MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE =
  "Too many places in this play area to measure safely. Pick one place or use a smaller play area.";

export const MEASURING_LINEAR_OVER_BUDGET_MESSAGE =
  "Those borders are too detailed for this play area. Try a smaller area or another category.";

export const MEASURING_OUTPUT_OVER_BUDGET_MESSAGE =
  "This measure is too complex for this play area. Try a shorter distance or a smaller area.";

/** Escalating Turf simplify tolerances — soften toward the output cap, then gate. */
const OUTPUT_SIMPLIFY_TOLERANCES = [0.000012, 0.00005, 0.0002, 0.001] as const;

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

/** Count ring vertices on a Polygon / MultiPolygon (no spread — Dublin-scale safe). */
export function countPolygonVertices(
  feature: Feature<Polygon | MultiPolygon>,
): number {
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

export function measuringGeometryJsonChars(
  feature: Feature<Polygon | MultiPolygon>,
): number {
  return JSON.stringify(feature.geometry).length;
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

function decimateRing(ring: number[][], stride: number): number[][] {
  if (ring.length <= 4 || stride <= 1) {
    return ring;
  }
  const kept: number[][] = [];
  for (let i = 0; i < ring.length - 1; i += stride) {
    kept.push(ring[i]!);
  }
  const first = kept[0]!;
  const last = kept[kept.length - 1]!;
  if (last[0] !== first[0] || last[1] !== first[1]) {
    kept.push([...first]);
  }
  if (kept.length < 4) {
    return ring;
  }
  return kept;
}

/** Last-resort vertex stride when Turf simplify cannot shrink (or throws). */
function decimatePolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
  maxVertices: number,
): Feature<Polygon | MultiPolygon> {
  const current = countPolygonVertices(feature);
  if (current <= maxVertices) {
    return feature;
  }
  const stride = Math.max(2, Math.ceil(current / maxVertices));
  if (feature.geometry.type === "Polygon") {
    return {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: feature.geometry.coordinates.map((ring) =>
          decimateRing(ring, stride),
        ),
      },
    };
  }
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: feature.geometry.coordinates.map((polygon) =>
        polygon.map((ring) => decimateRing(ring, stride)),
      ),
    },
  };
}

/**
 * Soften-then-gate: simplify toward the output cap; refuse with locked copy if still over.
 */
export function softenMeasuringOutputToBudget(
  feature: Feature<Polygon | MultiPolygon>,
): MeasuringOutputSoftenResult {
  let current = feature;
  if (assertMeasuringOutputComplexityBudget(current).ok) {
    return { ok: true, feature: current };
  }

  // Turf simplify thrash/stack-overflows on multi-k dense rings (CI 5s timeout);
  // skip straight to stride decimate above 1.25× the vertex cap.
  const initialVerts = countPolygonVertices(current);
  if (initialVerts <= MEASURING_OUTPUT_MAX_VERTICES * 1.25) {
    for (const tolerance of OUTPUT_SIMPLIFY_TOLERANCES) {
      try {
        const simplified = simplify(current, {
          tolerance,
          highQuality: false,
        }) as Feature<Polygon | MultiPolygon>;
        if (
          simplified.geometry.type === "Polygon" ||
          simplified.geometry.type === "MultiPolygon"
        ) {
          current = simplified;
        }
      } catch {
        // Keep last successful geometry and try the next tolerance / decimate.
      }
      if (assertMeasuringOutputComplexityBudget(current).ok) {
        return { ok: true, feature: current };
      }
    }
  }

  current = decimatePolygonFeature(current, MEASURING_OUTPUT_MAX_VERTICES);
  if (assertMeasuringOutputComplexityBudget(current).ok) {
    return { ok: true, feature: current };
  }

  return { ok: false, message: MEASURING_OUTPUT_OVER_BUDGET_MESSAGE };
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
