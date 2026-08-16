import type { Feature, MultiPolygon, Polygon } from "geojson";
import simplify from "@turf/simplify";
import { decimatePolygonFeature } from "./decimatePolygon";
import { countPolygonVertices } from "./polygonMetrics";

export type PolygonLodPhase = "coarse" | "refining" | "complete";

/** Above this, skip Turf simplify for preview LOD (stride decimate only). */
export const POLYGON_LOD_TURF_VERTEX_CEILING = 5_000;

/** Coarse → fine Turf tolerances (first = preview coarse). */
const LOD_TOLERANCES = [0.002, 0.0005, 0.0001, 0.00002] as const;

/** Decimate targets as fractions of full verts (coarse → fine) when Turf is skipped. */
const LOD_DECIMATE_FRACTIONS = [0.25, 0.4, 0.6, 0.85] as const;

function simplifyAtTolerance(
  feature: Feature<Polygon | MultiPolygon>,
  tolerance: number,
): Feature<Polygon | MultiPolygon> {
  try {
    const simplified = simplify(feature, {
      tolerance,
      highQuality: false,
    }) as Feature<Polygon | MultiPolygon>;
    if (
      simplified.geometry.type === "Polygon" ||
      simplified.geometry.type === "MultiPolygon"
    ) {
      return simplified;
    }
  } catch {
    // Keep input on Turf failure.
  }
  return feature;
}

function shouldSkipTurfLod(feature: Feature<Polygon | MultiPolygon>): boolean {
  return countPolygonVertices(feature) > POLYGON_LOD_TURF_VERTEX_CEILING;
}

/** Aggressive outline for first paint — fewer verts than full when dense. */
export function buildCoarsePolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> {
  const fullVerts = countPolygonVertices(feature);
  if (fullVerts <= 64) {
    return feature;
  }
  const target = Math.max(64, Math.floor(fullVerts * LOD_DECIMATE_FRACTIONS[0]));
  if (shouldSkipTurfLod(feature)) {
    return decimatePolygonFeature(feature, target);
  }
  let coarse = simplifyAtTolerance(feature, LOD_TOLERANCES[0]);
  if (countPolygonVertices(coarse) >= fullVerts) {
    coarse = decimatePolygonFeature(feature, target);
  }
  return coarse;
}

/**
 * Idle-friendly refine step toward full geometry.
 * `stepIndex` 0 = first refine after coarse; returns `{ done: true }` with full.
 */
export function refinePolygonFeatureStep(
  full: Feature<Polygon | MultiPolygon>,
  _current: Feature<Polygon | MultiPolygon>,
  stepIndex: number,
): { feature: Feature<Polygon | MultiPolygon>; done: boolean } {
  const nextIndex = stepIndex + 1;
  if (shouldSkipTurfLod(full)) {
    if (nextIndex >= LOD_DECIMATE_FRACTIONS.length) {
      return { feature: full, done: true };
    }
    const fullVerts = countPolygonVertices(full);
    const fraction = LOD_DECIMATE_FRACTIONS[nextIndex]!;
    const target = Math.max(64, Math.floor(fullVerts * fraction));
    const done = nextIndex >= LOD_DECIMATE_FRACTIONS.length - 1;
    return {
      feature: done ? full : decimatePolygonFeature(full, target),
      done,
    };
  }

  if (nextIndex >= LOD_TOLERANCES.length) {
    return { feature: full, done: true };
  }
  const tolerance = LOD_TOLERANCES[nextIndex]!;
  const feature = simplifyAtTolerance(full, tolerance);
  const done = nextIndex >= LOD_TOLERANCES.length - 1;
  return {
    feature: done ? full : feature,
    done,
  };
}
