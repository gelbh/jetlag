import { describe, expect, it } from "vitest";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";

describe("geoSpatialVoronoi shim", () => {
  it("re-exports kernel spatial voronoi", () => {
    const cells = geoSpatialVoronoiFromSites([
      { lng: -0.12, lat: 51.5, properties: { id: "a" } },
      { lng: -0.11, lat: 51.51, properties: { id: "b" } },
    ]);
    expect(cells.features.length).toBe(2);
  });
});
