import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import type { HiderQuestionTruthContextInput } from "./resolveHiderTruthReference";

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
        ([key, nestedValue]) => `${JSON.stringify(key)}:${pendingPlacementValueKey(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function openQuestionsContentKey(openQuestions: readonly PendingQuestionRecord[]): string {
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

export function buildHiderTruthFetchKey(
  openQuestions: readonly PendingQuestionRecord[],
  context: HiderQuestionTruthContextInput,
): string {
  return [
    openQuestionsContentKey(openQuestions),
    context.hiderUid,
    pointKey(context.zoneCenter),
    String(context.zoneRadiusMeters ?? "none"),
    context.session?.endGameStartedAt ?? "none",
    context.session?.endGameTruthAnchors
      ? JSON.stringify(context.session.endGameTruthAnchors)
      : "none",
    "place:omitted",
    "seeker:omitted",
  ].join("|");
}
