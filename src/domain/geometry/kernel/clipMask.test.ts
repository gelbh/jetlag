import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { clipMaskToGameArea } from "./clipMask";
import type { GameAreaGeometry, PolygonFeature } from "./types";

const gameArea: GameAreaGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-0.3, 51.4],
      [0.05, 51.4],
      [0.05, 51.5],
      [-0.3, 51.5],
      [-0.3, 51.4],
    ],
  ],
};

function squarePolygon(west: number): number[][][] {
  return [
    [
      [west, 51.42],
      [west + 0.03, 51.42],
      [west + 0.03, 51.48],
      [west, 51.48],
      [west, 51.42],
    ],
  ];
}

describe("clipMaskToGameArea", () => {
  it("keeps both overlapping MultiPolygon parts after clip", () => {
    const overlapping: PolygonFeature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [squarePolygon(-0.19), squarePolygon(-0.175)],
      },
    };

    const clipped = clipMaskToGameArea(overlapping, gameArea);

    expect(clipped).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), clipped!),
    ).toBe(true);
    expect(
      booleanPointInPolygon(turfPoint([-0.15, 51.45]), clipped!),
    ).toBe(true);
  });

  it("keeps valid MultiPolygon parts when one part cannot clip", () => {
    const mixed: PolygonFeature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [Number.NaN, 51.42],
              [-0.17, 51.48],
              [-0.2, 51.48],
              [-0.17, 51.42],
              [Number.NaN, 51.42],
            ],
          ],
          squarePolygon(-0.12),
        ],
      },
    };

    const clipped = clipMaskToGameArea(mixed, gameArea);

    expect(clipped).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.105, 51.45]), clipped!),
    ).toBe(true);
  });
});
