import { describe, expect, it } from "vitest";
import { buildMaskFromUnionInput } from "./buildMask";
import { assertPolygonTopologyParity } from "./parity";
import type { GameAreaGeometry, PolygonFeature } from "./types";
import {
  unionEliminationParts,
  unionEliminationPartsLegacy,
  type EliminationUnionInput,
} from "./unionPolygonFeatures";

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

describe("kernel parity", () => {
  it("martinez union matches turf legacy on sample grid", () => {
    const input: EliminationUnionInput = {
      polygons: [square(-0.18), square(-0.16)],
      disks: [],
    };
    assertPolygonTopologyParity(
      unionEliminationParts(input),
      unionEliminationPartsLegacy(input),
      { west: -0.2, east: -0.1, south: 51.4, north: 51.5 },
    );
  });

  it("buildMaskFromUnionInput is stable for golden outer ring", () => {
    const mask = buildMaskFromUnionInput(
      { polygons: [square(-0.18)], disks: [] },
      gameArea,
    );
    expect(mask).not.toBeNull();
    const ring =
      mask!.geometry.type === "Polygon"
        ? mask!.geometry.coordinates[0]
        : mask!.geometry.coordinates[0]?.[0];
    expect(ring?.map((coord) => coord.map((n) => Number(n.toFixed(5))))).toEqual(
      [
        [-0.18, 51.42],
        [-0.15, 51.42],
        [-0.15, 51.48],
        [-0.18, 51.48],
        [-0.18, 51.42],
      ],
    );
  });
});
