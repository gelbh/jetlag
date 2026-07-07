import { describe, expect, it } from "vitest";
import area from "@turf/area";
import { lineString } from "@turf/helpers";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";
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
