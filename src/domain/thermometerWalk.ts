import type { Feature, LineString, Point } from "geojson";
import type { LatLngTuple } from "./geometry";
import { distanceBetweenPoints } from "./geometryMeasuring";
import type { PendingQuestionPlacement } from "./sessionChat";
import type { PendingQuestionRecord } from "./sessionChat";

export function parseThermometerStartPoint(
  placement: PendingQuestionPlacement,
): LatLngTuple | null {
  try {
    const geometry = JSON.parse(placement.geometryJson) as Feature<
      Point | LineString
    >;
    const geom = geometry.geometry;
    if (geom.type === "Point") {
      return [geom.coordinates[1], geom.coordinates[0]];
    }
    if (geom.type === "LineString" && geom.coordinates.length > 0) {
      const first = geom.coordinates[0];
      return [first[1], first[0]];
    }
  } catch {
    return null;
  }
  return null;
}

export function isThermometerWalkActive(
  question: PendingQuestionRecord,
): boolean {
  return question.toolType === "thermometer" && question.status === "walking";
}

export function crowFliesDistanceMeters(a: LatLngTuple, b: LatLngTuple): number {
  return distanceBetweenPoints(a, b);
}

export function buildThermometerLineGeometry(
  a: LatLngTuple,
  b: LatLngTuple,
): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [a[1], a[0]],
        [b[1], b[0]],
      ],
    },
  };
}

export function buildThermometerStartPointGeometry(
  a: LatLngTuple,
): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [a[1], a[0]],
    },
  };
}
