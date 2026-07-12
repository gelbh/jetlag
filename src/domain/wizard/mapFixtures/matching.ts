import type { AnnotationRecord } from "../../map/annotations";
import { TUTORIAL_DUBLIN_GAME_AREA } from "../tutorialGameArea";

const MATCHING_TUTORIAL_ANNOTATION: AnnotationRecord = {
  id: "tutorial-matching-1",
  sessionId: "tutorial",
  type: "matching",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-6.34, 53.33],
          [-6.24, 53.33],
          [-6.24, 53.37],
          [-6.34, 53.37],
          [-6.34, 53.33],
        ],
      ],
    },
  },
  metadata: {
    createdAt: "2026-01-01T00:00:00.000Z",
    matchingCategory: "park",
    matchingAnswer: "yes",
    matchingAnchor: { lat: 53.3498, lng: -6.2603 },
  },
};

export function matchingTutorialMapFixture(): {
  gameArea: typeof TUTORIAL_DUBLIN_GAME_AREA;
  annotations: AnnotationRecord[];
} {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    annotations: [MATCHING_TUTORIAL_ANNOTATION],
  };
}
