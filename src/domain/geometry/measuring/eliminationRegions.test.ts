import { describe, expect, it } from "vitest";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { polygonFeatureToLeafletPolygonGroups } from "./eliminationRegions";

describe("polygonFeatureToLeafletPolygonGroups", () => {
  it("filters null and invalid coordinates from rings", () => {
    const feature: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [null as unknown as number, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const groups = polygonFeatureToLeafletPolygonGroups(feature);

    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toEqual([
      [0, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
  });

  it("drops polygons when the exterior ring is invalid even if a hole is valid", () => {
    const feature: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [null as unknown as number, 1],
          ],
          [
            [0.2, 0.2],
            [0.8, 0.2],
            [0.5, 0.8],
            [0.2, 0.2],
          ],
        ],
      },
    };

    expect(polygonFeatureToLeafletPolygonGroups(feature)).toEqual([]);
  });

  it("filters NaN and Infinity coordinates from multipolygons", () => {
    const feature: Feature<MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [Number.NaN, 1],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        ],
      },
    };

    const groups = polygonFeatureToLeafletPolygonGroups(feature);

    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toEqual([
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 2],
      [2, 2],
    ]);
  });

  it("returns empty groups when every ring is degenerate", () => {
    const feature: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [null as unknown as number, 1]]],
      },
    };

    expect(polygonFeatureToLeafletPolygonGroups(feature)).toEqual([]);
  });
});
