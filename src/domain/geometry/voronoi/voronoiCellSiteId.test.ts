import { describe, expect, it } from "vitest";
import type { Feature } from "geojson";
import { voronoiCellSiteId } from "./voronoiCellSiteId";

describe("voronoiCellSiteId", () => {
  it("reads nested d3-geo-voronoi site properties", () => {
    const cell = {
      type: "Feature",
      properties: {
        site: {
          properties: { featureId: "west" },
        },
      },
      geometry: { type: "Polygon", coordinates: [] },
    } as Feature;

    expect(voronoiCellSiteId(cell, ["featureId"])).toBe("west");
  });
});
