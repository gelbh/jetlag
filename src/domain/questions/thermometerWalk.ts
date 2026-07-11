import type { Feature, LineString, Point } from "geojson";
import type { LatLngTuple } from "../geometry/geometry";
import { haversineMeters } from "../geometry/distance";
import type { PendingQuestionPlacement } from "../session/sessionChat";
import type { PendingQuestionRecord } from "../session/sessionChat";

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

/** Client-only walk id when tracking a solo GPS walk without Firestore. */
export const LOCAL_THERMOMETER_WALK_ID = "__local_thermometer_walk__";

export function isLocalThermometerWalkId(
  questionId: string | null | undefined,
): boolean {
  return questionId === LOCAL_THERMOMETER_WALK_ID;
}

export function crowFliesDistanceMeters(a: LatLngTuple, b: LatLngTuple): number {
  return haversineMeters(a, b);
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
