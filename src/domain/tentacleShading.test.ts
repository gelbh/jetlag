import { describe, expect, it } from "vitest";
import {
  booleanPointInPolygon,
  circle as turfCircle,
  point as turfPoint,
} from "@turf/turf";
import type { GameArea } from "./annotations";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "./tentacleQuestions";
import { gameAreaToPolygon, safeDifference } from "./geometry";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("tentacle yes-radar shading (game minus answer disk)", () => {
  it("safeDifference leaves the 1.5 mi disk interior outside the shaded region", () => {
    const anchor: [number, number] = [-0.15, 51.45];
    const gamePolygon = gameAreaToPolygon(sampleGameArea);
    const radarCircle = turfCircle(
      turfPoint(anchor),
      TENTACLE_ANSWER_RADIUS_METERS / 1000,
      {
        steps: 64,
        units: "kilometers",
      },
    );
    const exterior = safeDifference(
      gamePolygon,
      radarCircle as Parameters<typeof safeDifference>[1],
    );

    expect(exterior).not.toBeNull();

    const insideDiskNearCenter = turfPoint([-0.151, 51.45]);
    const outsideDisk = turfPoint([-0.19, 51.45]);

    expect(booleanPointInPolygon(insideDiskNearCenter, exterior!)).toBe(false);
    expect(booleanPointInPolygon(outsideDisk, exterior!)).toBe(true);
  });

  it("answer radius is larger than search radius", () => {
    expect(TENTACLE_ANSWER_RADIUS_METERS).toBeGreaterThan(
      TENTACLE_SEARCH_RADIUS_METERS,
    );
  });
});
