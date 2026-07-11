import type { GameArea } from "../../map/annotations";
import type { MapStyle } from "../../map/mapBasemaps";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { buildMatchingOverlays } from "./matching";
import { buildMeasuringOverlays } from "./measuring";
import { buildRadarOverlays } from "./radar";
import type { PendingQuestionOverlayResult } from "./shared";
import { buildTentacleOverlays } from "./tentacle";
import { buildThermometerOverlays } from "./thermometer";

export type { PendingQuestionOverlayResult } from "./shared";

export function buildPendingQuestionOverlay(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
): PendingQuestionOverlayResult | null {
  if (question.status !== "pending") {
    return null;
  }

  const prefix = `pending-${question.id}`;
  let result: { overlays: PendingQuestionOverlayResult["overlays"]; badgeAnchor: PendingQuestionOverlayResult["badgeAnchor"] };

  switch (question.toolType) {
    case "radar":
      result = buildRadarOverlays(question, prefix);
      break;
    case "thermometer":
      result = buildThermometerOverlays(question, prefix);
      break;
    case "matching":
      result = buildMatchingOverlays(question, gameArea, prefix, mapStyle);
      break;
    case "measuring":
      result = buildMeasuringOverlays(question, gameArea, prefix, mapStyle);
      break;
    case "tentacle":
      result = buildTentacleOverlays(question, prefix);
      break;
    default:
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

export function buildPendingQuestionOverlays(
  questions: readonly PendingQuestionRecord[],
  gameArea: GameArea,
  mapStyle: MapStyle = "standard",
): PendingQuestionOverlayResult[] {
  return questions
    .map((question) => buildPendingQuestionOverlay(question, gameArea, mapStyle))
    .filter((result): result is PendingQuestionOverlayResult => result !== null);
}
