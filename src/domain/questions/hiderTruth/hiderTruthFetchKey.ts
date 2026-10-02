import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { isEndGameActive } from "../../map/annotations";
import {
  askOriginFromPendingQuestion,
  isAskOriginInsideHidingZone,
  type HiderQuestionTruthContextInput,
} from "./resolveHiderTruthReference";

const MAP_PIN_TRUTH_TOOLS = new Set([
  "tentacle",
  "matching",
  "measuring",
  "thermometer",
]);

function pointKey(point: LatLngTuple | null | undefined): string {
  return point ? point.join(",") : "none";
}

function relevantSeekerPlacesKey(
  openQuestions: readonly PendingQuestionRecord[],
  places: Readonly<Record<string, LatLngTuple>> | null | undefined,
): string {
  if (!places) {
    return "none";
  }
  const uids = new Set<string>();
  for (const question of openQuestions) {
    if (MAP_PIN_TRUTH_TOOLS.has(question.toolType) && question.createdByUid) {
      uids.add(question.createdByUid);
    }
  }
  if (uids.size === 0) {
    return "none";
  }
  return [...uids]
    .sort()
    .map((uid) => `${uid}:${places[uid]?.join(",") ?? ""}`)
    .join(";");
}

export function openQuestionNeedsHidingPlace(
  question: PendingQuestionRecord,
  context: HiderQuestionTruthContextInput,
): boolean {
  if (isEndGameActive(context.session)) {
    return false;
  }
  const askOrigin = askOriginFromPendingQuestion(
    question,
    context.seekerPlacesByUid,
  );
  return isAskOriginInsideHidingZone(
    askOrigin,
    context.zoneCenter,
    context.zoneRadiusMeters,
  );
}

export function buildHiderTruthFetchKey(
  openQuestions: readonly PendingQuestionRecord[],
  context: HiderQuestionTruthContextInput,
): string {
  const openIds = openQuestions
    .map((question) => question.id)
    .sort()
    .join(",");

  const needsPlace = openQuestions.some((question) =>
    openQuestionNeedsHidingPlace(question, context),
  );

  return [
    openIds,
    context.hiderUid,
    pointKey(context.zoneCenter),
    String(context.zoneRadiusMeters ?? "none"),
    context.session?.endGameStartedAt ?? "none",
    context.session?.endGameTruthAnchors
      ? JSON.stringify(context.session.endGameTruthAnchors)
      : "none",
    needsPlace ? pointKey(context.hidingPlace ?? null) : "place:omitted",
    relevantSeekerPlacesKey(openQuestions, context.seekerPlacesByUid),
  ].join("|");
}
