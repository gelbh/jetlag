import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../map/annotations";
import {
  buildMultiPlaceEliminationRegion,
  buildMultiPlaceNearRegion,
} from "./geometryMeasuring";
import { buildMultiPlaceNearRegionTs } from "./nearRegions";
import dublinCountyParksMeasuring from "./fixtures/dublinCountyParksMeasuring.json";

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

function countPolygonVertices(
  feature: Feature<Polygon | MultiPolygon>,
): number {
  let total = 0;
  if (feature.geometry.type === "Polygon") {
    for (const ring of feature.geometry.coordinates) {
      total += ring.length;
    }
    return total;
  }

  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      total += ring.length;
    }
  }
  return total;
}

describe("multi-place measuring geometry", () => {
  it("builds a union near region around every site", async () => {
    const distanceMeters = 2_500;
    const nearRegion = await buildMultiPlaceNearRegion(
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

  it("further answer shades inside any equal-distance disk", async () => {
    const distanceMeters = 2_500;
    const eliminated = await buildMultiPlaceEliminationRegion(
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

  it("closer answer shades outside every equal-distance disk", async () => {
    const distanceMeters = 2_500;
    const eliminated = await buildMultiPlaceEliminationRegion(
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

  it("unions County Dublin parks fixture without exploding", () => {
    const places = dublinCountyParksMeasuring.places as [number, number][];
    const gameArea = dublinCountyParksMeasuring.gameArea as GameArea;
    const distanceMeters = dublinCountyParksMeasuring.distanceMeters;

    expect(places).toHaveLength(107);

    const started = performance.now();
    const nearRegion = buildMultiPlaceNearRegionTs(
      places,
      distanceMeters,
      gameArea,
    );
    const elapsedMs = performance.now() - started;

    expect(nearRegion).not.toBeNull();
    expect(nearRegion?.geometry.type).toMatch(/Polygon|MultiPolygon/);
    expect(countPolygonVertices(nearRegion!)).toBeLessThan(50_000);
    expect(elapsedMs).toBeLessThan(2_000);
  });
});
