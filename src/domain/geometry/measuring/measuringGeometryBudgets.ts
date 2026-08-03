import type { Feature, LineString } from "geojson";
import {
  isMeasuringLinearLocation,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../questions/measuringQuestions";

/** Max places when measuring every site in the play area (HADK parks = 107). */
export const MEASURING_MULTI_PLACE_MAX = 128;

/** Max vertices across prepared linear segments (coast / LEA / borders). */
export const MEASURING_LINEAR_MAX_VERTICES = 12_000;

export const MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE =
  "Too many places in this play area to measure safely. Pick one place or use a smaller play area.";

export const MEASURING_LINEAR_OVER_BUDGET_MESSAGE =
  "Those borders are too detailed for this play area. Try a smaller area or another category.";

export type MeasuringBudgetResult =
  | { ok: true }
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
