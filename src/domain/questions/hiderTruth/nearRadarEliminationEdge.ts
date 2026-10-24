import type { Feature, LineString, Point } from "geojson";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import {
  lineEndpointsFromFeature,
  pointFromGeometryFeature,
} from "../../geometry/gameArea/geometryParsing";
import { isActive } from "../../map/annotationActive";
import { type AnnotationRecord, pointToolRadiusFromMetadata } from "../../map/annotations";

export const NEAR_ELIMINATION_EDGE_METERS = 50;

export const NEAR_RADAR_EDGE_METERS = NEAR_ELIMINATION_EDGE_METERS;

export type AnsweredRadarCircle = {
  center: LatLngTuple;
  radiusMeters: number;
  inside: boolean;
};

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

export type AnsweredThermometerSegment = {
  start: LatLngTuple;
  end: LatLngTuple;
};

export function answeredThermometerSegment(
  annotation: AnnotationRecord,
): AnsweredThermometerSegment | null {
  if (!isActive(annotation) || annotation.type !== "thermometer") {
    return null;
  }
  if (!annotation.metadata.thermometerAnswer) {
    return null;
  }
  if (annotation.geometry.geometry.type !== "LineString") {
    return null;
  }
  return lineEndpointsFromFeature(annotation.geometry as Feature<LineString>);
}

export function thermometerFlipGapMeters(
  point: LatLngTuple,
  start: LatLngTuple,
  end: LatLngTuple,
): number {
  return Math.abs(distanceBetweenPoints(point, start) - distanceBetweenPoints(point, end)) / 2;
}

export function isNearThermometerEliminationEdge(
  point: LatLngTuple,
  annotations: readonly AnnotationRecord[],
  thresholdMeters: number = NEAR_ELIMINATION_EDGE_METERS,
): boolean {
  for (const annotation of annotations) {
    const segment = answeredThermometerSegment(annotation);
    if (!segment) {
      continue;
    }
    if (thermometerFlipGapMeters(point, segment.start, segment.end) <= thresholdMeters) {
      return true;
    }
  }
  return false;
}
