import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import { haversineMeters } from "../../geometry/gameArea/distance";
import {
  parseGeometryJson,
  pointFromGeometryFeature,
} from "../../geometry/gameArea/geometryParsing";
import {
  isEndGameActive,
  type SessionRecord,
} from "../../map/annotations";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";

export type { EndGameTruthAnchor } from "../../session/hiding/endGameTruthAnchors";

export type HiderTruthReferenceMode =
  | "hidingPlace"
  | "hidingZoneCenter"
  | "endGameFreeze"
  | "unavailable";

export interface ResolveHiderTruthReferenceInput {
  hiderUid: string;
  zoneCenter: LatLngTuple | null;
  /** Live / last-known hiding place (hider GPS). */
  hidingPlace?: LatLngTuple | null;
  /** Seeker ask / placement origin used to decide in-zone truth. */
  askOrigin?: LatLngTuple | null;
  /** Precomputed; when omitted, derived from askOrigin + zone when radius known. */
  originInsideZone?: boolean;
  zoneRadiusMeters?: number | null;
  /**
   * Live seeker GPS by uid. Map-pin questions (tentacle/matching/measuring/
   * thermometer) use this as in-zone origin so a pin dropped on the hide does
   * not switch truth to hider GPS (LMTS).
   */
  seekerPlacesByUid?: Readonly<Record<string, LatLngTuple>> | null;
  session:
    | Pick<SessionRecord, "endGameStartedAt" | "endGameTruthAnchors">
    | null
    | undefined;
}

export interface HiderTruthReference {
  point: LatLngTuple | null;
  mode: HiderTruthReferenceMode;
}

function isUsableLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function isUsablePoint(point: LatLngTuple | null | undefined): point is LatLngTuple {
  return point != null && isUsableLatLng(point[0], point[1]);
}

export function isAskOriginInsideHidingZone(
  askOrigin: LatLngTuple | null | undefined,
  zoneCenter: LatLngTuple | null | undefined,
  zoneRadiusMeters: number | null | undefined,
): boolean {
  if (
    !isUsablePoint(askOrigin) ||
    !isUsablePoint(zoneCenter) ||
    typeof zoneRadiusMeters !== "number" ||
    !Number.isFinite(zoneRadiusMeters) ||
    zoneRadiusMeters < 0
  ) {
    return false;
  }

  return haversineMeters(askOrigin, zoneCenter) <= zoneRadiusMeters;
}

const MAP_PIN_TRUTH_TOOLS = new Set([
  "tentacle",
  "matching",
  "measuring",
  "thermometer",
]);

export function askOriginFromPendingQuestion(
  question: PendingQuestionRecord,
  seekerPlacesByUid?: Readonly<Record<string, LatLngTuple>> | null,
): LatLngTuple | null {
  if (MAP_PIN_TRUTH_TOOLS.has(question.toolType)) {
    const seekerPlace = question.createdByUid
      ? seekerPlacesByUid?.[question.createdByUid]
      : undefined;
    return isUsablePoint(seekerPlace) ? seekerPlace : null;
  }

  // Photo pending questions use geometryJson "{}" — parse must return null, not throw.
  const feature = parseGeometryJson(question.placement.geometryJson);
  return feature ? pointFromGeometryFeature(feature) : null;
}

export type HiderQuestionTruthContextInput = Omit<
  ResolveHiderTruthReferenceInput,
  "askOrigin" | "originInsideZone"
>;

/** Per-question truth reference (in-zone → hiding place; map pin stays zone/freeze). */
export function resolvePendingQuestionTruthReference(
  question: PendingQuestionRecord,
  context: HiderQuestionTruthContextInput,
): HiderTruthReference {
  return resolveHiderTruthReference({
    ...context,
    askOrigin: askOriginFromPendingQuestion(
      question,
      context.seekerPlacesByUid,
    ),
  });
}

export function resolveHiderTruthReference({
  hiderUid,
  zoneCenter,
  hidingPlace = null,
  askOrigin = null,
  originInsideZone,
  zoneRadiusMeters = null,
  session,
}: ResolveHiderTruthReferenceInput): HiderTruthReference {
  if (isEndGameActive(session)) {
    const anchor = session?.endGameTruthAnchors?.[hiderUid];
    if (anchor && isUsableLatLng(anchor.lat, anchor.lng)) {
      return {
        point: [anchor.lat, anchor.lng],
        mode: "endGameFreeze",
      };
    }

    return { point: null, mode: "unavailable" };
  }

  const insideZone =
    originInsideZone ??
    isAskOriginInsideHidingZone(askOrigin, zoneCenter, zoneRadiusMeters);

  if (insideZone && isUsablePoint(hidingPlace)) {
    return { point: hidingPlace, mode: "hidingPlace" };
  }

  if (isUsablePoint(zoneCenter)) {
    return { point: zoneCenter, mode: "hidingZoneCenter" };
  }

  return { point: null, mode: "unavailable" };
}
