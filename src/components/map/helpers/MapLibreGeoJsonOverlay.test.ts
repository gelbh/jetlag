import { describe, expect, it } from "vitest";
import type { Polygon } from "geojson";
import { polygonGeometryFeature } from "./MapLibreGeoJsonOverlay";

describe("polygonGeometryFeature", () => {
  it("wraps a polygon geometry as a Feature", () => {
    const geometry: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const feature = polygonGeometryFeature(geometry);
    expect(feature.type).toBe("Feature");
    expect(feature.geometry).toEqual(geometry);
  });
});
