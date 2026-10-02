import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import {
  parseGeometryJson,
  pointFromGeometryFeature,
} from "../../geometry/gameArea/geometryParsing";
import { isEndGameActive, type SessionRecord } from "../../map/annotations";
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
  /** Retained for callers; pre-end-game resolver ignores live hider GPS. */
  hidingPlace?: LatLngTuple | null;
  /** Retained for callers; pre-end-game resolver ignores ask origin. */
  askOrigin?: LatLngTuple | null;
  /** Retained for callers; pre-end-game resolver ignores in-zone hints. */
  originInsideZone?: boolean;
  zoneRadiusMeters?: number | null;
  /**
   * Live seeker GPS by uid. Used by `askOriginFromPendingQuestion` for map-pin
   * tools; pre-end-game truth reference stays zone center regardless.
   */
  seekerPlacesByUid?: Readonly<Record<string, LatLngTuple>> | null;
  session: Pick<SessionRecord, "endGameStartedAt" | "endGameTruthAnchors"> | null | undefined;
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

const MAP_PIN_TRUTH_TOOLS = new Set(["tentacle", "matching", "measuring", "thermometer"]);

export function isMapPinTruthTool(toolType: string): boolean {
  return MAP_PIN_TRUTH_TOOLS.has(toolType);
}

export function askOriginFromPendingQuestion(
  question: PendingQuestionRecord,
  seekerPlacesByUid?: Readonly<Record<string, LatLngTuple>> | null,
): LatLngTuple | null {
  if (isMapPinTruthTool(question.toolType)) {
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

/** Per-question truth reference (zone center until end-game freeze). */
export function resolvePendingQuestionTruthReference(
  question: PendingQuestionRecord,
  context: HiderQuestionTruthContextInput,
): HiderTruthReference {
  return resolveHiderTruthReference({
    ...context,
    askOrigin: askOriginFromPendingQuestion(question, context.seekerPlacesByUid),
  });
}

export function resolveHiderTruthReference({
  hiderUid,
  zoneCenter,
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

  if (isUsablePoint(zoneCenter)) {
    return { point: zoneCenter, mode: "hidingZoneCenter" };
  }

  return { point: null, mode: "unavailable" };
}
