import type { Feature, MultiPolygon, Polygon } from "geojson";
import simplify from "@turf/simplify";
import {
  MEASURING_OUTPUT_MAX_JSON_CHARS,
  MEASURING_OUTPUT_MAX_VERTICES,
  MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
  assertMeasuringOutputComplexityBudget,
  countPolygonVertices,
} from "../measuring/measuringGeometryBudgets";

/** Any elim GeoJSON write — Firestore vertex ceiling. */
export const POLYGON_PERSIST_MAX_VERTICES = MEASURING_OUTPUT_MAX_VERTICES;

/** Any elim GeoJSON write — JSON.stringify(geometry) UTF-16 ceiling. */
export const POLYGON_PERSIST_MAX_JSON_CHARS = MEASURING_OUTPUT_MAX_JSON_CHARS;

export type PersistSlimPolygonResult =
  | { ok: true; feature: Feature<Polygon | MultiPolygon> }
  | { ok: false; message: string };

/** Escalating Turf simplify tolerances — slim toward the persist cap, then gate. */
const PERSIST_SIMPLIFY_TOLERANCES = [0.000012, 0.00005, 0.0002, 0.001] as const;

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

/**
 * Persist path — slim toward Firestore ceiling; storage-oriented fail copy only.
 */
export function persistSlimPolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
): PersistSlimPolygonResult {
  let current = feature;
  if (assertMeasuringOutputComplexityBudget(current).ok) {
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
      if (assertMeasuringOutputComplexityBudget(current).ok) {
        return { ok: true, feature: current };
      }
    }
  }

  current = decimatePolygonFeature(current, POLYGON_PERSIST_MAX_VERTICES);
  if (assertMeasuringOutputComplexityBudget(current).ok) {
    return { ok: true, feature: current };
  }

  return { ok: false, message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE };
}
