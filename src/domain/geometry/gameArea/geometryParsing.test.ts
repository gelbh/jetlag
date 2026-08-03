import { describe, expect, it } from "vitest";
import {
  parseGeometryJson,
  parsePointGeometry,
  pointFromGeometryFeature,
} from "./geometryParsing";

describe("geometryParsing", () => {
  it("returns null for photo-style empty object geometryJson", () => {
    expect(parseGeometryJson("{}")).toBeNull();
    expect(parsePointGeometry("{}")).toBeNull();
  });

  it("returns null for Point geometry missing coordinates", () => {
    const json = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point" },
    });
    expect(parseGeometryJson(json)).toBeNull();
    expect(parsePointGeometry(json)).toBeNull();
  });

  it("returns null for LineString with fewer than two positions", () => {
    const json = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[-0.15, 51.45]] },
    });
    expect(parseGeometryJson(json)).toBeNull();
  });

  it("returns null for non-Feature wrappers", () => {
    expect(
      parseGeometryJson(
        JSON.stringify({ type: "Point", coordinates: [-0.15, 51.45] }),
      ),
    ).toBeNull();
  });

  it("does not throw when feature.geometry is missing", () => {
    expect(
      pointFromGeometryFeature({} as never),
    ).toBeNull();
  });

  it("parses a Point Feature", () => {
    const json = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-0.15, 51.45] },
    });
    expect(parsePointGeometry(json)).toEqual([51.45, -0.15]);
  });
});
