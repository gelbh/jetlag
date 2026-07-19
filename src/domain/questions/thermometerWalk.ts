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

/** Max in-tab GPS walk duration before the walk tracker auto-stops. */
export const THERMOMETER_WALK_MAX_DURATION_MS = 30 * 60 * 1000;

/** Walker location older than this (or missing) counts as stale for the host cue. */
export const THERMOMETER_WALK_LOCATION_STALE_MS = 2 * 60 * 1000;

export function listWalkingThermometerQuestionIds(
  questions: readonly PendingQuestionRecord[],
  createdByUid?: string,
): string[] {
  return questions
    .filter((question) => {
      if (!isThermometerWalkActive(question)) {
        return false;
      }
      if (createdByUid == null) {
        return true;
      }
      return question.createdByUid === createdByUid;
    })
    .map((question) => question.id);
}

export function listOrphanWalkingThermometerQuestionIds(
  questions: readonly PendingQuestionRecord[],
  memberUids: readonly string[],
): string[] {
  const members = new Set(memberUids);
  return questions
    .filter(
      (question) =>
        isThermometerWalkActive(question) &&
        !members.has(question.createdByUid),
    )
    .map((question) => question.id);
}

export function isStaleThermometerWalk(
  question: PendingQuestionRecord,
  walkerLocationUpdatedAt: string | null,
  nowMs: number,
  maxWalkMs: number = THERMOMETER_WALK_MAX_DURATION_MS,
  locationStaleMs: number = THERMOMETER_WALK_LOCATION_STALE_MS,
): boolean {
  if (!isThermometerWalkActive(question)) {
    return false;
  }

  const createdAtMs = Date.parse(question.createdAt);
  if (!Number.isFinite(createdAtMs) || nowMs - createdAtMs < maxWalkMs) {
    return false;
  }

  if (walkerLocationUpdatedAt == null) {
    return true;
  }

  const locationUpdatedAtMs = Date.parse(walkerLocationUpdatedAt);
  if (!Number.isFinite(locationUpdatedAtMs)) {
    return true;
  }

  return nowMs - locationUpdatedAtMs >= locationStaleMs;
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
