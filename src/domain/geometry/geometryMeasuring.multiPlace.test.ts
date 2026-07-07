import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea } from "../map/annotations";
import {
  buildMultiPlaceEliminationRegion,
  buildMultiPlaceNearRegion,
} from "./geometryMeasuring";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

const westAirport: [number, number] = [51.45, -0.18];
const eastAirport: [number, number] = [51.45, -0.12];

describe("multi-place measuring geometry", () => {
  it("builds a union near region around every site", () => {
    const distanceMeters = 2_500;
    const nearRegion = buildMultiPlaceNearRegion(
      [westAirport, eastAirport],
      distanceMeters,
      sampleGameArea,
    );

    expect(nearRegion?.geometry.type).toMatch(/Polygon|MultiPolygon/);
    expect(booleanPointInPolygon(turfPoint([-0.18, 51.45]), nearRegion!)).toBe(
      true,
    );
    expect(booleanPointInPolygon(turfPoint([-0.12, 51.45]), nearRegion!)).toBe(
      true,
    );
  });

  it("further answer shades inside any equal-distance disk", () => {
    const distanceMeters = 2_500;
    const eliminated = buildMultiPlaceEliminationRegion(
      [westAirport, eastAirport],
      distanceMeters,
      sampleGameArea,
      "further",
    );

    expect(eliminated).not.toBeNull();
    const besideWestAirport = turfPoint([-0.179, 51.45]);
    const farSouthWestCorner = turfPoint([-0.199, 51.405]);
    expect(booleanPointInPolygon(besideWestAirport, eliminated!)).toBe(true);
    expect(booleanPointInPolygon(farSouthWestCorner, eliminated!)).toBe(false);
  });

  it("closer answer shades outside every equal-distance disk", () => {
    const distanceMeters = 2_500;
    const eliminated = buildMultiPlaceEliminationRegion(
      [westAirport, eastAirport],
      distanceMeters,
      sampleGameArea,
      "closer",
    );

    expect(eliminated).not.toBeNull();
    if (eliminated?.geometry.type === "Polygon") {
      expect(eliminated.geometry.coordinates.length).toBeGreaterThan(1);
    }

    const farSouthWestCorner = turfPoint([-0.199, 51.405]);
    const besideWestAirport = turfPoint([-0.179, 51.45]);
    expect(booleanPointInPolygon(farSouthWestCorner, eliminated!)).toBe(true);
    expect(booleanPointInPolygon(besideWestAirport, eliminated!)).toBe(false);
  });
});
