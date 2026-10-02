import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { isEndGameActive } from "../../map/annotations";
import {
  askOriginFromPendingQuestion,
  isAskOriginInsideHidingZone,
  isMapPinTruthTool,
  type HiderQuestionTruthContextInput,
} from "./resolveHiderTruthReference";

function pointKey(point: LatLngTuple | null | undefined): string {
  return point ? point.join(",") : "none";
}

function pendingPlacementValueKey(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => pendingPlacementValueKey(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${pendingPlacementValueKey(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function openQuestionsContentKey(
  openQuestions: readonly PendingQuestionRecord[],
): string {
  return openQuestions
    .map((question) =>
      [
        question.id,
        question.toolType,
        question.placement.geometryJson,
        pendingPlacementValueKey(question.placement.metadata),
      ].join(":"),
    )
    .sort()
    .join(",");
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
    if (isMapPinTruthTool(question.toolType) && question.createdByUid) {
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
  const needsPlace = openQuestions.some((question) =>
    openQuestionNeedsHidingPlace(question, context),
  );

  return [
    openQuestionsContentKey(openQuestions),
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
