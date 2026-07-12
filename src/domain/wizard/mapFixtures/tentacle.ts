import type { AnnotationRecord } from "../../map/annotations";
import { milesToMeters } from "../../map/distance";
import { TUTORIAL_DUBLIN_GAME_AREA } from "../tutorialGameArea";

const tentacleElimination = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [-6.33, 53.335],
        [-6.25, 53.335],
        [-6.25, 53.355],
        [-6.33, 53.355],
        [-6.33, 53.335],
      ],
    ],
  },
};

const TENTACLE_TUTORIAL_ANNOTATION: AnnotationRecord = {
  id: "tutorial-tentacle-1",
  sessionId: "tutorial",
  type: "tentacle",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [-6.2603, 53.3498],
    },
  },
  metadata: {
    createdAt: "2026-01-01T00:00:00.000Z",
    tentacleCategoryId: "museum",
    radiusMeters: milesToMeters(1),
    tentacleAnswerPoiName: "National Museum",
    tentacleEliminationJson: JSON.stringify(tentacleElimination),
  },
};

export function tentacleTutorialMapFixture(): {
  gameArea: typeof TUTORIAL_DUBLIN_GAME_AREA;
  annotations: AnnotationRecord[];
} {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    annotations: [TENTACLE_TUTORIAL_ANNOTATION],
  };
}
