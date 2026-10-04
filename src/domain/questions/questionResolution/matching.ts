import { deserializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../geometry/measuring/matchingGeometry";
import { persistEliminationOrDeferPoint } from "../../geometry/progressive/persistEliminationOrDeferPoint";
import { persistSlimPolygonFeature } from "../../geometry/progressive/persistSlim";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { deferredPointFromPendingPlacement } from "../deferredSeekerPoint";
import type { MatchingAnswer } from "../matchingQuestions";

export function matchingAnswerFromReplyId(replyId: string): MatchingAnswer | null {
  if (replyId === "yes" || replyId === "no") {
    return replyId;
  }

  return null;
}

export async function resolveMatchingPendingQuestion(
  pending: PendingQuestionRecord,
  answer: MatchingAnswer,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  const metadata = pending.placement.metadata;
  const featuresJson = metadata.matchingFeaturesJson;
  const seekerFeatureId = metadata.matchingNearestFeatureId;

  if (typeof featuresJson !== "string" || typeof seekerFeatureId !== "string") {
    return null;
  }

  const features = deserializeMatchingFeatures(featuresJson);
  const geometry = JSON.parse(pending.placement.geometryJson) as AnnotationRecord["geometry"];
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

  const boundaryRegion = await buildSameNearestRegion(features, seekerFeatureId, gameArea);
  const eliminationRegion = await buildMatchingEliminationRegion(
    features,
    seekerFeatureId,
    gameArea,
    answer,
  );

  if (!boundaryRegion || !eliminationRegion) {
    return null;
  }

  const slimmedBoundary = persistSlimPolygonFeature(boundaryRegion);
  const deferPoint = deferredPointFromPendingPlacement(pending);
  if (!deferPoint) {
    return null;
  }

  const persisted = persistEliminationOrDeferPoint({
    elimination: eliminationRegion,
    deferPoint,
  });

  return {
    type: "matching",
    geometry: persisted.geometry,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      matchingAnswer: answer,
      ...(slimmedBoundary.ok
        ? { matchingBoundaryJson: JSON.stringify(slimmedBoundary.feature) }
        : {}),
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}
