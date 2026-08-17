import { describe, expect, it, vi } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import { unionPolygonFeatures } from "./unionPolygonFeatures";

vi.mock("martinez-polygon-clipping", () => ({
  union: () => [],
}));

vi.mock("@turf/union", () => ({
  default: () => {
    throw new Error("turf union failed");
  },
}));

function squareFeature(west: number): Feature<GeoPolygon> {
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

describe("unionPolygonFeatures clip failure", () => {
  it("keeps both polygons when clip engines fail", () => {
    const combined = unionPolygonFeatures([
      squareFeature(-0.19),
      squareFeature(-0.12),
    ]);

    expect(combined?.geometry.type).toBe("MultiPolygon");
    expect(
      booleanPointInPolygon(turfPoint([-0.175, 51.45]), combined!),
    ).toBe(true);
    expect(
      booleanPointInPolygon(turfPoint([-0.105, 51.45]), combined!),
    ).toBe(true);
  });
});
