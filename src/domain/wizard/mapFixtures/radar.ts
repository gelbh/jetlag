import { milesToMeters } from "../../map/distance";
import type { AnnotationRecord } from "../../map/annotations";
import { TUTORIAL_DUBLIN_GAME_AREA } from "../tutorialGameArea";

const RADAR_TUTORIAL_ANNOTATION: AnnotationRecord = {
  id: "tutorial-radar-1",
  sessionId: "tutorial",
  type: "radar",
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
    radiusMeters: milesToMeters(3),
    inside: false,
  },
};

export function radarTutorialMapFixture(): {
  gameArea: typeof TUTORIAL_DUBLIN_GAME_AREA;
  annotations: AnnotationRecord[];
} {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    annotations: [RADAR_TUTORIAL_ANNOTATION],
  };
}
