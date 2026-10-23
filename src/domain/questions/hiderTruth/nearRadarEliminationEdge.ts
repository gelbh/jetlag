import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { isActive } from "../../map/annotationActive";
import type { AnnotationRecord } from "../../map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";

/** Display-only: truth pin caution when within this gap of a radar circumference. */
export const NEAR_RADAR_EDGE_METERS = 50;

/**
 * True when `point` sits within `thresholdMeters` of any active answered radar's
 * elimination edge (disk-no and exterior-yes share the same circumference).
 */
export function isNearRadarEliminationEdge(
  point: LatLngTuple,
  annotations: readonly AnnotationRecord[],
  thresholdMeters: number = NEAR_RADAR_EDGE_METERS,
): boolean {
  for (const annotation of annotations) {
    if (!isActive(annotation) || annotation.type !== "radar") {
      continue;
    }
    if (typeof annotation.metadata.inside !== "boolean") {
      continue;
    }

    const geometry = annotation.geometry.geometry;
    if (geometry.type !== "Point") {
      continue;
    }

    const radarCenter: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const gapMeters = Math.abs(distanceBetweenPoints(point, radarCenter) - radiusMeters);
    if (gapMeters <= thresholdMeters) {
      return true;
    }
  }

  return false;
}
