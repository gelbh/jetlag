import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { GameArea } from "../../map/annotations";
import { buildCoastlineNearRegionDistanceThreshold } from "./coastlineNearRegion";
import { countPolygonVertices } from "./measuringGeometryBudgets";

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-1, 50],
      [1, 50],
      [1, 52],
      [-1, 52],
      [-1, 50],
    ],
  ],
};

const shore: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-0.8, 51],
      [0.8, 51],
    ],
  },
};

function ringHasNonAxisEdge(feature: Feature<Polygon>): boolean {
  const ring = feature.geometry.coordinates[0] ?? [];
  for (let i = 1; i < ring.length; i += 1) {
    const [x0, y0] = ring[i - 1]!;
    const [x1, y1] = ring[i]!;
    if (x0 !== x1 && y0 !== y1) {
      return true;
    }
  }
  return false;
}

describe("linear near-region isoline", () => {
  it("is not a single axis-aligned rectangle on a large AABB shore", async () => {
    const region = await buildCoastlineNearRegionDistanceThreshold([shore], 5_000, gameArea, {
      divisions: 24,
    });
    expect(region).not.toBeNull();
    expect(countPolygonVertices(region!)).toBeGreaterThan(5);
    const polygon =
      region!.geometry.type === "Polygon"
        ? (region as Feature<Polygon>)
        : {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: region!.geometry.coordinates[0]!,
            },
          };
    expect(ringHasNonAxisEdge(polygon)).toBe(true);
    expect(booleanPointInPolygon(turfPoint([0, 51]), region!)).toBe(true);
  });

  it("keeps unstamped remainder near-boundary cells as coarse rects", async () => {
    const parallels: Feature<LineString>[] = [];
    for (let index = 0; index < 10; index += 1) {
      const lat = 50.15 + index * 0.18;
      parallels.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.9, lat],
            [0.9, lat],
          ],
        },
      });
    }
    const region = await buildCoastlineNearRegionDistanceThreshold(parallels, 10_000, gameArea, {
      divisions: 24,
    });
    expect(region).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([0, 50.15]), region!)).toBe(true);
    expect(booleanPointInPolygon(turfPoint([0, 50.15 + 9 * 0.18]), region!)).toBe(true);
  });
});
