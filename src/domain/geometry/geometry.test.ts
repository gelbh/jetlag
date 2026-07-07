import { describe, expect, it } from "vitest";
import bboxPolygon from "@turf/bbox-polygon";
import type { Feature, LineString } from "geojson";
import {
  buildCoastlineEliminationRegion,
  buildCoastlineNearRegion,
  buildLocationEliminationRegion,
  buildLocationNearRegion,
  buildHalfPlanePolygon,
  boundsToGameArea,
  centerToViewportEdgeRadiusMeters,
  circleToGameArea,
  clearCoastlineNearRegionCacheForTests,
  distanceBetweenPoints,
  gameAreaOutsideMask,
  isPointInGameArea,
  nearestPointToCoastlines,
  normalizeBoundingBox,
  prepareMeasuringLineSegments,
  safeDifference,
} from "./geometry";
import type { GameArea } from "../map/annotations";

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

describe("geometry helpers", () => {
  it("converts map bounds into a closed polygon", () => {
    const bounds = {
      getSouthWest: () => ({ lat: 51.4, lng: -0.2 }),
      getNorthEast: () => ({ lat: 51.5, lng: -0.1 }),
    };

    const gameArea = boundsToGameArea(bounds as never);
    expect(gameArea.coordinates[0][0]).toEqual([-0.2, 51.4]);
    expect(gameArea.coordinates[0]).toHaveLength(5);
  });

  it("measures circle radius from center to nearest viewport edge", () => {
    const bounds = {
      getSouthWest: () => ({ lat: 51.4, lng: -0.2 }),
      getNorthEast: () => ({ lat: 51.5, lng: -0.1 }),
    };
    const center: [number, number] = [51.45, -0.15];

    const radiusMeters = centerToViewportEdgeRadiusMeters(center, bounds as never);
    expect(radiusMeters).toBeGreaterThan(0);
    expect(radiusMeters).toBeLessThan(15_000);
  });

  it("builds a circular game area from center and radius", () => {
    const gameArea = circleToGameArea([51.45, -0.15], 2_000);
    expect(gameArea.type).toBe("Polygon");
    expect(gameArea.coordinates[0].length).toBeGreaterThan(8);
  });

  it("expands collapsed bounding boxes before building a game area", () => {
    const gameArea = normalizeBoundingBox({
      south: 53.35,
      north: 53.35,
      west: -6.26,
      east: -6.25,
    });

    expect(gameArea.north - gameArea.south).toBeGreaterThan(0);
    expect(gameArea.east - gameArea.west).toBeGreaterThan(0);
  });

  it("returns a clipped polygon for thermometer shading", () => {
    const colderSide = buildHalfPlanePolygon(
      [51.45, -0.18],
      [51.46, -0.12],
      sampleGameArea,
    );
    expect(colderSide?.geometry.type).toBe("Polygon");
  });

  it("shades opposite halves for hotter and colder answers", () => {
    const pointA: [number, number] = [51.45, -0.18];
    const pointB: [number, number] = [51.46, -0.12];
    const colderAnswerSide = buildHalfPlanePolygon(
      pointA,
      pointB,
      sampleGameArea,
      "cold",
    );
    const hotterAnswerSide = buildHalfPlanePolygon(
      pointA,
      pointB,
      sampleGameArea,
      "hot",
    );

    expect(colderAnswerSide?.geometry.type).toBe("Polygon");
    expect(hotterAnswerSide?.geometry.type).toBe("Polygon");
    expect(colderAnswerSide?.geometry.coordinates).not.toEqual(
      hotterAnswerSide?.geometry.coordinates,
    );
  });

  it("subtracts an inner polygon safely", () => {
    const outer = bboxPolygon([-0.2, 51.4, -0.1, 51.5]);
    const inner = bboxPolygon([-0.18, 51.42, -0.12, 51.48]);
    const result = safeDifference(outer, inner);
    expect(result?.geometry.type).toBe("Polygon");
  });

  it("builds an outside mask for the play area", () => {
    const outsideMask = gameAreaOutsideMask(sampleGameArea);
    expect(outsideMask?.type).toBe("Polygon");
    expect(outsideMask?.coordinates.length).toBeGreaterThan(1);
  });

  it("checks whether a point is inside the play area", () => {
    expect(isPointInGameArea([51.45, -0.15], sampleGameArea)).toBe(true);
    expect(isPointInGameArea([51.2, -0.5], sampleGameArea)).toBe(false);
  });

  it("finds the nearest coastline point to a seeker", () => {
    const coast: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.2, 51.4],
          [-0.1, 51.4],
        ],
      },
    };

    const nearest = nearestPointToCoastlines([51.45, -0.15], [coast]);
    expect(nearest?.point[0]).toBeCloseTo(51.4, 4);
    expect(nearest?.point[1]).toBeCloseTo(-0.15, 4);
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("builds coastline distance regions from shoreline segments", () => {
    const coast: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.2, 51.4],
          [-0.1, 51.4],
        ],
      },
    };
    const nearCoast = buildCoastlineNearRegion([coast], 5_000, sampleGameArea);
    const eliminated = buildCoastlineEliminationRegion(
      [coast],
      5_000,
      sampleGameArea,
      "closer",
    );

    expect(nearCoast?.geometry.type).toBe("Polygon");
    expect(eliminated?.geometry.type).toBe("Polygon");
    expect(isPointInGameArea([51.45, -0.15], sampleGameArea)).toBe(true);
  });

  it("reuses a precomputed near region when building elimination regions", () => {
    const coast: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.2, 51.4],
          [-0.1, 51.4],
        ],
      },
    };
    const nearCoast = buildCoastlineNearRegion([coast], 5_000, sampleGameArea);
    const eliminated = buildCoastlineEliminationRegion(
      [coast],
      5_000,
      sampleGameArea,
      "further",
      nearCoast,
    );

    expect(eliminated).toEqual(nearCoast);
  });

  it("reuses cached coastline near regions for identical inputs", () => {
    clearCoastlineNearRegionCacheForTests();

    const coast: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.2, 51.4],
          [-0.1, 51.4],
        ],
      },
    };

    const first = buildCoastlineNearRegion([coast], 5_000, sampleGameArea);
    const second = buildCoastlineNearRegion([coast], 5_000, sampleGameArea);

    expect(first).toBe(second);
  });

  it("drops measuring segments that do not intersect the play area", () => {
    const inside: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.19, 51.41],
          [-0.11, 51.49],
        ],
      },
    };
    const outside: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.5, 51.2],
          [-0.4, 51.2],
        ],
      },
    };

    const prepared = prepareMeasuringLineSegments(
      [inside, outside],
      sampleGameArea,
    );

    expect(prepared.segments).toHaveLength(1);
    expect(prepared.boundingBoxes).toHaveLength(1);
  });

  it("builds location distance regions from a map point", () => {
    const target: [number, number] = [51.44, -0.16];
    const nearRegion = buildLocationNearRegion(target, 2_000, sampleGameArea);
    const eliminated = buildLocationEliminationRegion(
      target,
      2_000,
      sampleGameArea,
      "further",
    );

    expect(nearRegion?.geometry.type).toBe("Polygon");
    expect(eliminated?.geometry.type).toBe("Polygon");
    expect(distanceBetweenPoints([51.45, -0.15], target)).toBeGreaterThan(0);
  });

  it("builds a closer-than-measure region with a hole around the target", () => {
    const target: [number, number] = [51.44, -0.16];
    const eliminated = buildLocationEliminationRegion(
      target,
      2_000,
      sampleGameArea,
      "closer",
    );

    expect(eliminated?.geometry.type).toBe("Polygon");
    if (eliminated?.geometry.type === "Polygon") {
      expect(eliminated.geometry.coordinates.length).toBeGreaterThan(1);
    }
  });
});
