import { milesToMeters } from "../../map/distance";
import type { AnnotationRecord } from "../../map/annotations";
import { TUTORIAL_DUBLIN_GAME_AREA } from "../tutorialGameArea";

const THERMOMETER_TUTORIAL_ANNOTATION: AnnotationRecord = {
  id: "tutorial-thermometer-1",
  sessionId: "tutorial",
  type: "thermometer",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-6.32, 53.34],
        [-6.22, 53.36],
      ],
    },
  },
  metadata: {
    createdAt: "2026-01-01T00:00:00.000Z",
    thermometerDistanceMeters: milesToMeters(3),
    thermometerAnswer: "hotter",
    hotterTowards: "b",
  },
};

export function thermometerTutorialMapFixture(): {
  gameArea: typeof TUTORIAL_DUBLIN_GAME_AREA;
  annotations: AnnotationRecord[];
} {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    annotations: [THERMOMETER_TUTORIAL_ANNOTATION],
  };
}
