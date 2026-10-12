import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  type TentacleExtendedCategoryId,
  tentacleQuestionPrompt,
} from "@/domain/questions";
import type { ToolPendingInput } from "../matching/matchingPendingInput";

export function buildTentaclePendingInput(input: {
  center: LatLngTuple;
  categoryId: TentacleExtendedCategoryId;
  pois: TentaclePoi[];
  searchRadiusMeters: number;
  distanceUnit: DistanceUnit;
  cardDraw: number | undefined;
  cardKeep: number | undefined;
}): ToolPendingInput {
  const { center, categoryId, pois, searchRadiusMeters } = input;
  const geometry = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [center[1], center[0]],
    },
  };

  return {
    promptText: tentacleQuestionPrompt(categoryId, input.distanceUnit, searchRadiusMeters),
    replyOptions: [
      ...pois.map((poi) => ({
        id: poi.id,
        label: poi.name,
      })),
      {
        id: "out-of-reach",
        label: TENTACLE_NOT_WITHIN_REACH_LABEL,
      },
    ],
    placement: {
      geometryJson: JSON.stringify(geometry),
      metadata: {
        tentacleCategoryId: categoryId,
        radiusMeters: searchRadiusMeters,
        centerJson: JSON.stringify({
          lat: center[0],
          lng: center[1],
        }),
        poisJson: JSON.stringify(pois),
      },
    },
    cardDraw: input.cardDraw,
    cardKeep: input.cardKeep,
  };
}
