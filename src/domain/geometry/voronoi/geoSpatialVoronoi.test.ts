import { describe, expect, it } from "vitest";
import area from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString, point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";
import { resolveVoronoiCellPoiId, voronoiCellSiteId } from "./voronoiCellSiteId";
import { geodesicLineBuffer } from "../kernel/geodesicLineBuffer";

/** Finite clip cells can reach ~1e10–1e11 m²; planet-scale was ≫1e14. */
const MAX_PLAUSIBLE_CELL_AREA_M2 = 1e12;

const DUBLIN_GRID_SPACING_DEGREES = 0.003;
const DUBLIN_GRID_ORIGIN = { lat: 53.35, lng: -6.26 };

const dublinGridSites = Array.from({ length: 8 }, (_, index) => {
  const row = Math.floor(index / 4);
  const col = index % 4;
  return {
    lng: DUBLIN_GRID_ORIGIN.lng + col * DUBLIN_GRID_SPACING_DEGREES,
    lat: DUBLIN_GRID_ORIGIN.lat + row * DUBLIN_GRID_SPACING_DEGREES,
    properties: { poiId: `grid-${index}` },
  };
});

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

describe("geoSpatialVoronoiFromSites — Dublin-like grid", () => {
  it("every labeled cell contains its own site", () => {
    const cells = geoSpatialVoronoiFromSites(dublinGridSites);

    for (const site of dublinGridSites) {
      const owningCell = cells.features.find(
        (cell) => voronoiCellSiteId(cell, ["poiId"]) === site.properties.poiId,
      );

      expect(owningCell, `missing cell for ${site.properties.poiId}`).toBeDefined();
      expect(
        booleanPointInPolygon(
          turfPoint([site.lng, site.lat]),
          owningCell as Feature<Polygon | MultiPolygon>,
        ),
        `${site.properties.poiId} not inside its own cell`,
      ).toBe(true);
    }
  });

  it("each site owns exactly one cell", () => {
    const cells = geoSpatialVoronoiFromSites(dublinGridSites);
    const siteIds = cells.features
      .map((cell) => voronoiCellSiteId(cell, ["poiId"]))
      .filter((id): id is string => Boolean(id));

    expect(siteIds.length).toBe(dublinGridSites.length);
    expect(new Set(siteIds).size).toBe(dublinGridSites.length);
  });

  it("produces no cell at planet-scale relative to the play area", () => {
    const cells = geoSpatialVoronoiFromSites(dublinGridSites);

    for (const cell of cells.features) {
      if (cell.geometry.type !== "Polygon" && cell.geometry.type !== "MultiPolygon") {
        throw new Error(`Unexpected Voronoi geometry: ${cell.geometry.type}`);
      }
      const cellArea = area(cell as Feature<Polygon | MultiPolygon>);
      expect(cellArea).toBeGreaterThan(0);
      expect(cellArea).toBeLessThan(MAX_PLAUSIBLE_CELL_AREA_M2);
    }
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

describe("geoSpatialVoronoiFromSites — extent coverage", () => {
  it("includes a far probe that is nearest to a site beyond a 6 km bbox margin", () => {
    const sites = [
      { lng: -6.26, lat: 53.35, properties: { poiId: "west" } },
      { lng: -6.257, lat: 53.35, properties: { poiId: "east" } },
    ];
    const cells = geoSpatialVoronoiFromSites(sites);
    const westCell = cells.features.find((f) => f.properties?.poiId === "west");
    expect(westCell).toBeDefined();
    const kmPerLongitudeDegree = 111.32 * Math.cos((53.35 * Math.PI) / 180);
    const farWest: [number, number] = [-6.26 - 8 / kmPerLongitudeDegree, 53.35];
    expect(
      booleanPointInPolygon(
        turfPoint(farWest),
        westCell as Feature<Polygon | MultiPolygon>,
      ),
      "8 km west probe should remain in western cell",
    ).toBe(true);
  });
});

describe("geoSpatialVoronoiFromSites — coincident sites", () => {
  it("keeps the first site when coordinates are exact duplicates", () => {
    const cells = geoSpatialVoronoiFromSites([
      { lng: -6.26, lat: 53.35, properties: { poiId: "first" } },
      { lng: -6.26, lat: 53.35, properties: { poiId: "dup" } },
      { lng: -6.25, lat: 53.35, properties: { poiId: "other" } },
    ]);
    const ids = cells.features.map((f) => f.properties?.poiId);
    expect(ids).toContain("first");
    expect(ids).toContain("other");
    expect(ids).not.toContain("dup");
    expect(cells.features).toHaveLength(2);
  });
});

