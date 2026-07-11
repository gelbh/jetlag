import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MatchingAnswer } from "../matchingQuestions";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../geometry/matchingGeometry";
import { deserializeMatchingFeatures } from "../../../domain/geo/matchingAdapters";
import type { PendingQuestionRecord } from "../../session/sessionChat";

export function matchingAnswerFromReplyId(
  replyId: string,
): MatchingAnswer | null {
  if (replyId === "yes" || replyId === "no") {
    return replyId;
  }

  return null;
}

export function resolveMatchingPendingQuestion(
  pending: PendingQuestionRecord,
  answer: MatchingAnswer,
  gameArea: GameArea,
): Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null {
  const metadata = pending.placement.metadata;
  const featuresJson = metadata.matchingFeaturesJson;
  const seekerFeatureId = metadata.matchingNearestFeatureId;

  if (typeof featuresJson !== "string" || typeof seekerFeatureId !== "string") {
    return null;
  }

  const features = deserializeMatchingFeatures(featuresJson);
  const geometry = JSON.parse(
    pending.placement.geometryJson,
  ) as AnnotationRecord["geometry"];
  const matchingNullAnswer = metadata.matchingNullAnswer === true;

  if (matchingNullAnswer) {
    return {
      type: "matching",
      geometry,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        matchingAnswer: answer,
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    };
  }

  const boundaryRegion = buildSameNearestRegion(
    features,
    seekerFeatureId,
    gameArea,
  );
  const eliminationRegion = buildMatchingEliminationRegion(
    features,
    seekerFeatureId,
    gameArea,
    answer,
  );

  if (!boundaryRegion || !eliminationRegion) {
    return null;
  }

  return {
    type: "matching",
    geometry: eliminationRegion,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      matchingAnswer: answer,
      matchingBoundaryJson: JSON.stringify(boundaryRegion),
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}
