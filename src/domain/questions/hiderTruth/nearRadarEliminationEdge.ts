import type { Feature, LineString, Point } from "geojson";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import {
  lineEndpointsFromFeature,
  pointFromGeometryFeature,
} from "../../geometry/gameArea/geometryParsing";
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

export type AnsweredThermometerSegment = {
  start: LatLngTuple;
  end: LatLngTuple;
};

/** Active answered thermometer with LineString endpoints. */
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

/**
 * Half the absolute difference of distances to the walk endpoints.
 * Zero on the hotter/colder flip locus; matches truthThermometer distances.
 */
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

/** Caution pin: near any answered radar circumference or thermometer flip edge. */
export function isNearEliminationEdge(
  point: LatLngTuple,
  annotations: readonly AnnotationRecord[],
  thresholdMeters: number = NEAR_ELIMINATION_EDGE_METERS,
): boolean {
  return (
    isNearRadarEliminationEdge(point, annotations, thresholdMeters) ||
    isNearThermometerEliminationEdge(point, annotations, thresholdMeters)
  );
}
