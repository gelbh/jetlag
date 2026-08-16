import type { Feature, MultiPolygon, Polygon } from "geojson";
import simplify from "@turf/simplify";
import {
  countPolygonVertices,
  persistSlimMeasuringGeometry,
  type MeasuringOutputSoftenResult,
} from "./measuringGeometryBudgets";

export type MeasuringLodPhase = "coarse" | "refining" | "complete";

export {
  MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
  persistSlimMeasuringGeometry,
} from "./measuringGeometryBudgets";

export type PersistSlimMeasuringResult = MeasuringOutputSoftenResult;

/** Coarse → fine Turf tolerances (first = preview coarse). */
const LOD_TOLERANCES = [0.002, 0.0005, 0.0001, 0.00002] as const;

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

/** Aggressive outline for first paint — fewer verts than full when dense. */
export function buildMeasuringCoarseFeature(
  feature: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> {
  const fullVerts = countPolygonVertices(feature);
  if (fullVerts <= 64) {
    return feature;
  }
  let coarse = simplifyAtTolerance(feature, LOD_TOLERANCES[0]);
  if (countPolygonVertices(coarse) >= fullVerts) {
    coarse = decimatePolygonFeature(
      feature,
      Math.max(64, Math.floor(fullVerts / 4)),
    );
  }
  return coarse;
}

/**
 * Idle-friendly refine step toward full geometry.
 * `stepIndex` 0 = first refine after coarse; returns `{ done: true }` with full.
 */
export function refineMeasuringFeatureStep(
  full: Feature<Polygon | MultiPolygon>,
  _current: Feature<Polygon | MultiPolygon>,
  stepIndex: number,
): { feature: Feature<Polygon | MultiPolygon>; done: boolean } {
  const nextToleranceIndex = stepIndex + 1;
  if (nextToleranceIndex >= LOD_TOLERANCES.length) {
    return { feature: full, done: true };
  }
  const tolerance = LOD_TOLERANCES[nextToleranceIndex]!;
  const feature = simplifyAtTolerance(full, tolerance);
  const done = nextToleranceIndex >= LOD_TOLERANCES.length - 1;
  return {
    feature: done ? full : feature,
    done,
  };
}
