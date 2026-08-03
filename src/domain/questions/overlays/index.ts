import type { GameArea } from "../../map/annotations";
import type { MapStyle, StreetBasemap } from "../../map/mapBasemaps";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { pendingQuestionOverlayBuilders } from "../questionToolRegistry";
import type { PendingQuestionOverlayResult } from "./shared";

export type { PendingQuestionOverlayResult } from "./shared";

export async function buildPendingQuestionOverlay(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
  streetBasemap: StreetBasemap = "light",
): Promise<PendingQuestionOverlayResult | null> {
  if (question.status !== "pending") {
    return null;
  }

  const builder = pendingQuestionOverlayBuilders[question.toolType];
  if (!builder) {
    return null;
  }

  const prefix = `pending-${question.id}`;
  let result;
  try {
    result = await builder(question, gameArea, prefix, mapStyle, streetBasemap);
  } catch {
    return null;
  }

  if (result.overlays.length === 0) {
    return null;
  }

  return {
    questionId: question.id,
    overlays: result.overlays,
    badgeAnchor: result.badgeAnchor,
  };
}

export async function buildPendingQuestionOverlays(
  questions: readonly PendingQuestionRecord[],
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
  streetBasemap: StreetBasemap = "light",
): Promise<PendingQuestionOverlayResult[]> {
  const results = await Promise.all(
    questions.map((question) =>
      buildPendingQuestionOverlay(question, gameArea, mapStyle, streetBasemap),
    ),
  );
  return results.filter(
    (result): result is PendingQuestionOverlayResult => result !== null,
  );
}
