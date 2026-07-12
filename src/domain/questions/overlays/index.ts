import type { GameArea } from "../../map/annotations";
import type { MapStyle } from "../../map/mapBasemaps";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { pendingQuestionOverlayBuilders } from "../questionToolRegistry";
import type { PendingQuestionOverlayResult } from "./shared";

export type { PendingQuestionOverlayResult } from "./shared";

export function buildPendingQuestionOverlay(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
): PendingQuestionOverlayResult | null {
  if (question.status !== "pending") {
    return null;
  }

  const builder = pendingQuestionOverlayBuilders[question.toolType];
  if (!builder) {
    return null;
  }

  const prefix = `pending-${question.id}`;
  const result = builder(question, gameArea, prefix, mapStyle);

  if (result.overlays.length === 0) {
    return null;
  }

  return {
    questionId: question.id,
    overlays: result.overlays,
    badgeAnchor: result.badgeAnchor,
  };
}

export function buildPendingQuestionOverlays(
  questions: readonly PendingQuestionRecord[],
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
): PendingQuestionOverlayResult[] {
  return questions
    .map((question) => buildPendingQuestionOverlay(question, gameArea, mapStyle))
    .filter((result): result is PendingQuestionOverlayResult => result !== null);
}
