import type { Feature, Point } from "geojson";
import { deserializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import { parseGeometryJson } from "../../geometry/gameArea/geometryParsing";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../geometry/measuring/matchingGeometry";
import { persistSlimPolygonFeature } from "../../geometry/progressive/persistSlim";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { seekerAnchorFromMetadata } from "../hiderTruth/shared";
import type { MatchingAnswer } from "../matchingQuestions";

function deferredMatchingPointGeometry(pending: PendingQuestionRecord): Feature<Point> | null {
  const parsed = parseGeometryJson(pending.placement.geometryJson);
  if (parsed?.geometry.type === "Point") {
    return parsed as Feature<Point>;
  }

  const anchor = seekerAnchorFromMetadata(pending.placement.metadata);
  if (!anchor) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [anchor[1], anchor[0]],
    },
  };
}

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
  const slimmedElim = persistSlimPolygonFeature(eliminationRegion);

  if (slimmedElim.ok) {
    return {
      type: "matching",
      geometry: slimmedElim.feature,
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

  // Persist ceiling (Landmass / Measuring twin): keep a Point + matching metadata so
  // the map can rebuild shade instead of cancelling the answered question.
  const deferredPoint = deferredMatchingPointGeometry(pending);
  if (!deferredPoint) {
    return null;
  }

  return {
    type: "matching",
    geometry: deferredPoint,
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
