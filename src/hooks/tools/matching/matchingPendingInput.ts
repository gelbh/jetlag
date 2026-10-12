import type { Feature, Point } from "geojson";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { serializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { type MatchingCategoryId, matchingQuestionFor } from "@/domain/questions";
import type { SessionCustomCategory } from "@/domain/session/catalog/sessionCustomContent";
import type { MatchingFeature } from "@/services/geo/matching";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";

export type ToolPendingInput = Omit<
  SubmitPendingQuestionInput,
  "sessionId" | "senderUid" | "senderRole" | "toolType"
>;

export function buildMatchingPendingInput(input: {
  seekerPoint: LatLngTuple;
  categoryId: MatchingCategoryId;
  customCategories: readonly SessionCustomCategory[];
  nullAnswer: boolean;
  nearestFeatureId: string | null;
  nearestFeatureName: string | null;
  nearestFeaturePoint: LatLngTuple | null;
  distanceMeters: number | null;
  featureCount: number | null;
  features: MatchingFeature[];
  transitMetroId: string | null;
  cardDraw: number | undefined;
  cardKeep: number | undefined;
}): ToolPendingInput {
  const { seekerPoint, nearestFeaturePoint, transitMetroId } = input;
  const geometry: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [seekerPoint[1], seekerPoint[0]],
    },
  };

  return {
    promptText: matchingQuestionFor(input.categoryId, input.customCategories).prompt,
    replyOptions: [
      ...yesNoAnswerOptions.map((option) => ({
        id: option.value,
        label: option.label,
      })),
      ...(input.nullAnswer ? [{ id: "null", label: "Null (not in play area)" }] : []),
    ],
    placement: {
      geometryJson: JSON.stringify(geometry),
      metadata: {
        matchingCategory: input.categoryId,
        matchingAnchor: {
          lat: seekerPoint[0],
          lng: seekerPoint[1],
        },
        matchingNearestFeatureId: input.nearestFeatureId ?? undefined,
        matchingNearestFeatureName: input.nearestFeatureName ?? undefined,
        matchingNearestFeaturePoint: nearestFeaturePoint
          ? {
              lat: nearestFeaturePoint[0],
              lng: nearestFeaturePoint[1],
            }
          : undefined,
        matchingDistanceMeters: input.distanceMeters ?? undefined,
        matchingFeatureCount: input.featureCount ?? undefined,
        matchingNullAnswer: input.nullAnswer,
        matchingFeaturesJson: serializeMatchingFeatures(input.features),
        ...(transitMetroId ? { transitMetroId } : {}),
      },
    },
    cardDraw: input.cardDraw,
    cardKeep: input.cardKeep,
  };
}
