import type { Feature, MultiPolygon, Point, Polygon } from "geojson";
import {
  persistSlimPolygonFeature,
  type PersistSlimPolygonResult,
} from "./persistSlim";

export type PersistOrDeferEliminationResult =
  | { kind: "stored"; geometry: Feature<Polygon | MultiPolygon> }
  | { kind: "deferred"; geometry: Feature<Point> };

/**
 * Store slim elimination polygon when under persist budget; otherwise keep a
 * Point so callers can rebuild shade from metadata.
 */
export function persistEliminationOrDeferPoint(input: {
  elimination: Feature<Polygon | MultiPolygon>;
  deferPoint: Feature<Point>;
  slim?: (feature: Feature<Polygon | MultiPolygon>) => PersistSlimPolygonResult;
}): PersistOrDeferEliminationResult {
  const slim = input.slim ?? persistSlimPolygonFeature;
  const slimmed = slim(input.elimination);
  if (slimmed.ok) {
    return { kind: "stored", geometry: slimmed.feature };
  }
  return { kind: "deferred", geometry: input.deferPoint };
}
