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
