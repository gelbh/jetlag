import type { Feature, MultiPolygon, Point, Polygon } from "geojson";
import {
  persistSlimPolygonFeature,
  type PersistSlimPolygonResult,
} from "./persistSlim";

export type PersistOrDeferEliminationResult =
  | { kind: "stored"; geometry: Feature<Polygon | MultiPolygon> }
  | { kind: "deferred"; geometry: Feature<Point> }
  | { kind: "unavailable" };

/**
 * Store slim elimination polygon when under persist budget; otherwise keep a
 * Point so callers can rebuild shade from metadata. Slim-fail with no Point →
 * unavailable (caller soft-fails).
 */
export function persistEliminationOrDeferPoint(input: {
  elimination: Feature<Polygon | MultiPolygon>;
  deferPoint: Feature<Point> | null;
  slim?: (feature: Feature<Polygon | MultiPolygon>) => PersistSlimPolygonResult;
}): PersistOrDeferEliminationResult {
  const slim = input.slim ?? persistSlimPolygonFeature;
  const slimmed = slim(input.elimination);
  if (slimmed.ok) {
    return { kind: "stored", geometry: slimmed.feature };
  }
  if (!input.deferPoint) {
    return { kind: "unavailable" };
  }
  return { kind: "deferred", geometry: input.deferPoint };
}
