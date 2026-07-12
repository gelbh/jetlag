import type { AnnotationRecord } from "../../map/annotations";
import { TUTORIAL_DUBLIN_GAME_AREA } from "../tutorialGameArea";

const MEASURING_TUTORIAL_ANNOTATION: AnnotationRecord = {
  id: "tutorial-measuring-1",
  sessionId: "tutorial",
  type: "measuring",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-6.36, 53.32],
          [-6.22, 53.32],
          [-6.22, 53.38],
          [-6.36, 53.38],
          [-6.36, 53.32],
        ],
      ],
    },
  },
  metadata: {
    createdAt: "2026-01-01T00:00:00.000Z",
    measuringSubject: "location",
    measuringLocationCategory: "park",
    measuringAnswer: "closer",
    measuringTargetName: "Phoenix Park",
    measuringAnchor: { lat: 53.3498, lng: -6.2603 },
    measuringDistanceMeters: 2400,
  },
};

export function measuringTutorialMapFixture(): {
  gameArea: typeof TUTORIAL_DUBLIN_GAME_AREA;
  annotations: AnnotationRecord[];
} {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    annotations: [MEASURING_TUTORIAL_ANNOTATION],
  };
}
