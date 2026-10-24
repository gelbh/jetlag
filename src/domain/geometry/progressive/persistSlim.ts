import simplify from "@turf/simplify";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { decimatePolygonFeature } from "./decimatePolygon";
import {
  assertPolygonPersistBudget,
  countPolygonVertices,
  POLYGON_PERSIST_MAX_VERTICES,
  POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
} from "./polygonMetrics";

export {
  POLYGON_PERSIST_MAX_JSON_CHARS,
  POLYGON_PERSIST_MAX_VERTICES,
  POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
} from "./polygonMetrics";

export type PersistSlimPolygonResult =
  | { ok: true; feature: Feature<Polygon | MultiPolygon> }
  | { ok: false; message: string };

const PERSIST_SIMPLIFY_TOLERANCES = [0.000012, 0.00005, 0.0002, 0.001] as const;

export function persistSlimPolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
): PersistSlimPolygonResult {
  let current = feature;
  if (assertPolygonPersistBudget(current).ok) {
    return { ok: true, feature: current };
  }

  const initialVerts = countPolygonVertices(current);
  if (initialVerts <= POLYGON_PERSIST_MAX_VERTICES * 1.25) {
    for (const tolerance of PERSIST_SIMPLIFY_TOLERANCES) {
      try {
        const simplified = simplify(current, {
          tolerance,
          highQuality: false,
        }) as Feature<Polygon | MultiPolygon>;
        if (simplified.geometry.type === "Polygon" || simplified.geometry.type === "MultiPolygon") {
          current = simplified;
        }
      } catch {
        /* Turf can throw on dense rings */
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
