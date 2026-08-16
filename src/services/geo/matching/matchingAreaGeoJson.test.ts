import { describe, expect, it } from "vitest";
import type { FeatureCollection, Polygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import { parseMatchingAreaGeoJson } from "./matchingAreaGeoJson";

function namedSquare(index: number): FeatureCollection["features"][number] {
  const x = (index % 10) * 0.05;
  const y = Math.floor(index / 10) * 0.05;
  return {
    type: "Feature",
    properties: { name: `Area ${String(index).padStart(2, "0")}` },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, y],
          [x + 0.02, y],
          [x + 0.02, y + 0.02],
          [x, y + 0.02],
          [x, y],
        ],
      ],
    } satisfies Polygon,
  };
}

describe("parseMatchingAreaGeoJson", () => {
  it("keeps 51 named polygons intersecting the play area", () => {
    const playArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-0.05, -0.05],
          [0.55, -0.05],
          [0.55, 0.3],
          [-0.05, 0.3],
          [-0.05, -0.05],
        ],
      ],
    };
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: Array.from({ length: 51 }, (_, i) => namedSquare(i)),
    };

    const divisions = parseMatchingAreaGeoJson(
      JSON.stringify(collection),
      playArea,
      8,
    );
    expect(divisions).toHaveLength(51);
  });
});
