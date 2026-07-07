import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import { buildMeasuringRegions, type MeasuringRegionInput } from "../../geometry/measuringRegions";
import type { MeasuringAnswer } from "../measuringQuestions";
import type { PendingQuestionRecord } from "../../session/sessionChat";

export function measuringAnswerFromReplyId(
  replyId: string,
): MeasuringAnswer | null {
  if (replyId === "closer" || replyId === "further") {
    return replyId;
  }

  return null;
}

export function resolveMeasuringPendingQuestion(
  pending: PendingQuestionRecord,
  answer: MeasuringAnswer,
  gameArea: GameArea,
): Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null {
  const metadata = pending.placement.metadata;
  const measuringRegionInputJson = metadata.measuringRegionInputJson;

  if (typeof measuringRegionInputJson !== "string") {
    return null;
  }

  const regionInput = JSON.parse(measuringRegionInputJson) as Omit<
    MeasuringRegionInput,
    "measuringAnswer"
  >;
  const regions = buildMeasuringRegions({
    ...regionInput,
    measuringAnswer: answer,
    gameArea: regionInput.gameArea ?? gameArea,
  });

  if (!regions) {
    return null;
  }

  return {
    type: "measuring",
    geometry: regions.elimination,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      measuringAnswer: answer,
      measuringBoundaryJson: JSON.stringify(regions.near),
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}
