import { describe, expect, it } from "vitest";
import {
  buildThermometerLineGeometry,
  crowFliesDistanceMeters,
  parseThermometerStartPoint,
} from "./thermometerWalk";

describe("thermometerWalk", () => {
  it("parses start point from placement geometry", () => {
    const placement = {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-6.26, 53.35] },
      }),
      metadata: {},
    };
    expect(parseThermometerStartPoint(placement)).toEqual([53.35, -6.26]);
  });

  it("measures crow-flies distance", () => {
    const a: [number, number] = [53.35, -6.26];
    const b: [number, number] = [53.36, -6.25];
    expect(crowFliesDistanceMeters(a, b)).toBeGreaterThan(0);
  });

  it("builds line geometry between two points", () => {
    const feature = buildThermometerLineGeometry([53.35, -6.26], [53.36, -6.25]);
    expect(feature.geometry.type).toBe("LineString");
    expect(feature.geometry.coordinates).toHaveLength(2);
  });
});
