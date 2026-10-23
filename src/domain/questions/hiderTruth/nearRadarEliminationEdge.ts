import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { pointFromGeometryFeature } from "../../geometry/gameArea/geometryParsing";
import { isActive } from "../../map/annotationActive";
import { type AnnotationRecord, pointToolRadiusFromMetadata } from "../../map/annotations";

/** Display-only: truth pin caution when within this gap of a radar circumference. */
export const NEAR_RADAR_EDGE_METERS = 50;

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

    const radarCenter = pointFromGeometryFeature(annotation.geometry);
    if (!radarCenter) {
      continue;
    }

    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    const gapMeters = Math.abs(distanceBetweenPoints(point, radarCenter) - radiusMeters);
    if (gapMeters <= thresholdMeters) {
      return true;
    }
  }

  return false;
}
