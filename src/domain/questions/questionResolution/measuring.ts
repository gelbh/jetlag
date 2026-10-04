import { persistSlimMeasuringGeometry } from "../../geometry/measuring/measuringGeometryBudgets";
import {
  buildMeasuringRegions,
  type MeasuringRegionInput,
} from "../../geometry/measuring/measuringRegions";
import { persistEliminationOrDeferPoint } from "../../geometry/progressive/persistEliminationOrDeferPoint";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { deferredPointFromPendingPlacement } from "../deferredSeekerPoint";
import { measuringPlacesFromMetadata } from "../measuringPlacesFromMetadata";
import type { MeasuringAnswer } from "../measuringQuestions";

export function measuringAnswerFromReplyId(replyId: string): MeasuringAnswer | null {
  if (replyId === "closer" || replyId === "further") {
    return replyId;
  }

  return null;
}

export async function resolveMeasuringPendingQuestion(
  pending: PendingQuestionRecord,
  answer: MeasuringAnswer,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  const metadata = pending.placement.metadata;
  const measuringRegionInputJson = metadata.measuringRegionInputJson;

  if (typeof measuringRegionInputJson !== "string") {
    return null;
  }

  const regionInput = JSON.parse(measuringRegionInputJson) as Omit<
    MeasuringRegionInput,
    "measuringAnswer" | "gameArea"
  > & { gameArea?: GameArea };

  const measuringPlaces = measuringPlacesFromMetadata(metadata, regionInput.measuringPlaces);

  const regions = await buildMeasuringRegions({
    ...regionInput,
    measuringPlaces,
    measuringAnswer: answer,
    // Session play area wins; legacy embedded gameArea is ignored for size/safety.
    gameArea,
  });

  if (!regions) {
    return null;
  }

  const deferPoint = deferredPointFromPendingPlacement(pending);
  if (!deferPoint) {
    return null;
  }

  const persisted = persistEliminationOrDeferPoint({
    elimination: regions.elimination,
    deferPoint,
    slim: persistSlimMeasuringGeometry,
  });

  return {
    type: "measuring",
    geometry: persisted.geometry,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      measuringAnswer: answer,
      measuringRegionInputJson,
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}
