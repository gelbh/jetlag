import type { Feature, Point } from "geojson";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { pointFromGeometryFeature } from "../../geometry/gameArea/geometryParsing";
import { isActive } from "../../map/annotationActive";
import { type AnnotationRecord, pointToolRadiusFromMetadata } from "../../map/annotations";

/** Shared pin highlight + radar truth: within this gap of a radar circumference. */
export const NEAR_RADAR_EDGE_METERS = 50;

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
    if (!isActive(annotation) || annotation.type !== "radar") {
      continue;
    }
    // Answered radar: disk-no and exterior-yes share the same circumference.
    const answered = typeof annotation.metadata.inside === "boolean";
    if (!answered || annotation.geometry.geometry.type !== "Point") {
      continue;
    }

    const radarCenter = pointFromGeometryFeature(annotation.geometry as Feature<Point>);
    if (!radarCenter) {
      continue;
    }

    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    if (radarCircumferenceGapMeters(point, radarCenter, radiusMeters) <= thresholdMeters) {
      return true;
    }
  }

  return false;
}
