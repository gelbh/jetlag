import type { Feature, MultiPolygon, Polygon } from "geojson";
import simplify from "@turf/simplify";
import { decimatePolygonFeature } from "./decimatePolygon";
import {
  POLYGON_PERSIST_MAX_VERTICES,
  POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
  assertPolygonPersistBudget,
  countPolygonVertices,
} from "./polygonMetrics";

export {
  POLYGON_PERSIST_MAX_JSON_CHARS,
  POLYGON_PERSIST_MAX_VERTICES,
  POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
} from "./polygonMetrics";

export type PersistSlimPolygonResult =
  | { ok: true; feature: Feature<Polygon | MultiPolygon> }
  | { ok: false; message: string };

/** Escalating Turf simplify tolerances — slim toward the persist cap, then gate. */
const PERSIST_SIMPLIFY_TOLERANCES = [0.000012, 0.00005, 0.0002, 0.001] as const;

/**
 * Persist path — slim toward Firestore ceiling; storage-oriented fail copy only.
 */
export function persistSlimPolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
): PersistSlimPolygonResult {
  let current = feature;
  if (assertPolygonPersistBudget(current).ok) {
    return { ok: true, feature: current };
  }

  // Turf simplify thrash/stack-overflows on multi-k dense rings (CI 5s timeout);
  // skip straight to stride decimate above 1.25× the vertex cap.
  const initialVerts = countPolygonVertices(current);
  if (initialVerts <= POLYGON_PERSIST_MAX_VERTICES * 1.25) {
    for (const tolerance of PERSIST_SIMPLIFY_TOLERANCES) {
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
      if (assertPolygonPersistBudget(current).ok) {
        return { ok: true, feature: current };
      }
    }
  }

  current = decimatePolygonFeature(current, POLYGON_PERSIST_MAX_VERTICES);
  if (assertPolygonPersistBudget(current).ok) {
    return { ok: true, feature: current };
  }

  return {
    ok: false,
    message: POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
  };
}
