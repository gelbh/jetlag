import type { Feature, Point } from "geojson";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { pointFromGeometryFeature } from "../../geometry/gameArea/geometryParsing";
import { isActive } from "../../map/annotationActive";
import { type AnnotationRecord, pointToolRadiusFromMetadata } from "../../map/annotations";

/** Shared pin highlight + tool truth: within this gap of an answer boundary. */
export const NEAR_ELIMINATION_EDGE_METERS = 50;

/** Alias kept for radar call sites; same threshold as NEAR_ELIMINATION_EDGE_METERS. */
export const NEAR_RADAR_EDGE_METERS = NEAR_ELIMINATION_EDGE_METERS;

export type AnsweredRadarCircle = {
  center: LatLngTuple;
  radiusMeters: number;
  inside: boolean;
};

/**
 * Active answered radar with a Point centre. Shared by pin highlight, elimination
 * disk/exterior, and (via gap helpers) radar truth alignment on radius defaults.
 */
export function answeredRadarCircle(annotation: AnnotationRecord): AnsweredRadarCircle | null {
  if (!isActive(annotation) || annotation.type !== "radar") {
    return null;
  }
  if (annotation.geometry.geometry.type !== "Point") {
    return null;
  }
  if (typeof annotation.metadata.inside !== "boolean") {
    return null;
  }

  const center = pointFromGeometryFeature(annotation.geometry as Feature<Point>);
  if (!center) {
    return null;
  }

  return {
    center,
    radiusMeters: pointToolRadiusFromMetadata(annotation.metadata),
    inside: annotation.metadata.inside,
  };
}

/** Absolute metres between `point` and the circle of `radiusMeters` around `center`. */
export function radarCircumferenceGapMeters(
  point: LatLngTuple,
  center: LatLngTuple,
  radiusMeters: number,
): number {
  return Math.abs(distanceBetweenPoints(point, center) - radiusMeters);
}

export function isNearRadarEliminationEdge(
  point: LatLngTuple,
  annotations: readonly AnnotationRecord[],
  thresholdMeters: number = NEAR_RADAR_EDGE_METERS,
): boolean {
  for (const annotation of annotations) {
    const circle = answeredRadarCircle(annotation);
    if (!circle) {
      continue;
    }
    if (radarCircumferenceGapMeters(point, circle.center, circle.radiusMeters) <= thresholdMeters) {
      return true;
    }
  }

  return false;
}
