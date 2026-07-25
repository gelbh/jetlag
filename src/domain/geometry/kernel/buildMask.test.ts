import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./buildMask";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";

const gameArea: GameAreaGeometry = {
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

function square(west: number): PolygonFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, 51.42],
          [west + 0.03, 51.42],
          [west + 0.03, 51.48],
          [west, 51.48],
          [west, 51.42],
        ],
      ],
    },
  };
}

describe("kernel/buildMask", () => {
  it("unions polygons and clips to game area", () => {
    const mask = buildMaskFromUnionInput(
      { polygons: [square(-0.18)], disks: [] },
      gameArea,
    );
    expect(mask).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.165, 51.45]), mask!),
    ).toBe(true);
  });

  it("builds end-game mask from disks", () => {
    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    const mask = buildEndGameMaskFromDisks(gameArea, disks);
    expect(mask).not.toBeNull();
  });
});
