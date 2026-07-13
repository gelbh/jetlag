import { describe, expect, it } from "vitest";
import area from "@turf/area";
import { lineString } from "@turf/helpers";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";
import { resolveVoronoiCellPoiId, voronoiCellSiteId } from "./voronoiCellSiteId";
import { geodesicLineBuffer } from "./geodesicLineBuffer";

describe("geoSpatialVoronoiFromSites", () => {
  it("returns polygon cells for multiple sites", () => {
    const cells = geoSpatialVoronoiFromSites([
      { lng: -0.12, lat: 51.5, properties: { id: "a" } },
      { lng: -0.11, lat: 51.51, properties: { id: "b" } },
      { lng: -0.13, lat: 51.49, properties: { id: "c" } },
    ]);

    expect(cells.features.length).toBeGreaterThanOrEqual(3);
    expect(cells.features.every((cell) => cell.geometry.type === "Polygon")).toBe(
      true,
    );
  });

  it("preserves poiId on projected voronoi cells", () => {
    const cells = geoSpatialVoronoiFromSites([
      { lng: -0.18, lat: 51.45, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
    ]);

    const siteIds = cells.features
      .map((cell) => voronoiCellSiteId(cell, ["poiId"]))
      .filter(Boolean);

    expect(siteIds).toContain("west");
    expect(siteIds).toContain("east");
  });

  it("resolves poiId for all 7 spread sites", () => {
    const sites = Array.from({ length: 7 }, (_, index) => ({
      lng: -0.15 + (index - 3) * 0.003,
      lat: 51.45 + (index - 3) * 0.002,
      properties: { poiId: `poi-${index}` },
    }));

    const cells = geoSpatialVoronoiFromSites(sites);
    const resolved = cells.features.map((cell) =>
      resolveVoronoiCellPoiId(cell, sites.map((s) => ({
        id: s.properties.poiId,
        lat: s.lat,
        lng: s.lng,
      })), ["poiId"]),
    );

    expect(new Set(resolved.filter(Boolean)).size).toBe(7);
  });
});

describe("geodesicLineBuffer", () => {
  it("builds a polygon buffer around a short line", () => {
    const segment = lineString([
      [-0.12, 51.5],
      [-0.119, 51.501],
    ]);
    const buffered = geodesicLineBuffer(segment, 200);

    expect(buffered?.geometry.type).toBe("Polygon");
    expect(area(buffered!)).toBeGreaterThan(0);
  });
});
