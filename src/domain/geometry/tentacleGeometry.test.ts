import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea, TentaclePoi } from "../map/annotations";
import { milesToMeters } from "../map/distance";
import {
  clearVoronoiCellCacheForTests,
  getCachedVoronoiCells,
  tentacleSitesFingerprint,
} from "./voronoiCellCache";
import { voronoiCellSiteId } from "./voronoiCellSiteId";
import {
  buildTentacleEliminationRegion,
  buildTentaclePoiAnswerEliminationRegion,
  tentacleEliminationJsonForAnswer,
} from "./tentacleGeometry";

const oneMileMeters = milesToMeters(1);

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

const westMuseum: TentaclePoi = {
  id: "west",
  name: "West",
  lat: 51.45,
  lng: -0.18,
  category: "museum",
};

const eastMuseum: TentaclePoi = {
  id: "east",
  name: "East",
  lat: 51.45,
  lng: -0.12,
  category: "museum",
};

describe("tentacleGeometry", () => {
  it("resolves poiId from cached voronoi cells used in elimination", () => {
    clearVoronoiCellCacheForTests();
    const pois = [westMuseum, eastMuseum];
    const cells = getCachedVoronoiCells(
      tentacleSitesFingerprint(pois),
      pois.map((poi) => ({
        lng: poi.lng,
        lat: poi.lat,
        properties: { poiId: poi.id },
      })),
    );

    const siteIds = cells.features.map((cell) =>
      voronoiCellSiteId(cell, ["poiId"]),
    );

    expect(siteIds).toContain("west");
    expect(siteIds).toContain("east");
    expect(new Set(siteIds.filter(Boolean)).size).toBe(2);
  });

  it("returns null when fewer than two POIs", () => {
    expect(
      buildTentacleEliminationRegion(
        [51.45, -0.15],
        oneMileMeters,
        [westMuseum],
        "west",
        sampleGameArea,
      ),
    ).toBeNull();
  });


  it("single POI answer shades only the exterior of the search disk", () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = buildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum],
      "west",
      sampleGameArea,
    );

    expect(region).not.toBeNull();

    const outsideDisk = turfPoint([-0.19, 51.45]);
    const insideDisk = turfPoint([-0.151, 51.45]);

    expect(booleanPointInPolygon(outsideDisk, region!)).toBe(true);
    expect(booleanPointInPolygon(insideDisk, region!)).toBe(false);
  });

  it("tentacleEliminationJsonForAnswer serializes single-POI exterior shading", () => {
    const json = tentacleEliminationJsonForAnswer({
      anchor: [51.45, -0.15],
      radiusMeters: oneMileMeters,
      pois: [westMuseum],
      answeredPoiId: "west",
      outOfReach: false,
      gameArea: sampleGameArea,
    });

    expect(json).toBeDefined();
    expect(JSON.parse(json!)).toMatchObject({
      geometry: { type: expect.stringMatching(/Polygon|MultiPolygon/) },
    });
  });

  it("Voronoi cells inside the answer radius nearer to another POI than the answer", () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum, eastMuseum],
      "east",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(region?.geometry.type).toMatch(/Polygon|MultiPolygon/);
    const westOfBisectorInsideMile = turfPoint([-0.165, 51.45]);
    const eastOfBisectorInsideMile = turfPoint([-0.135, 51.45]);
    expect(booleanPointInPolygon(westOfBisectorInsideMile, region!)).toBe(true);
    expect(booleanPointInPolygon(eastOfBisectorInsideMile, region!)).toBe(
      false,
    );
  });

  it("shades the search disk except near the answered poi", () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum, eastMuseum],
      "east",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    const nearAnsweredPoi = turfPoint([-0.125, 51.45]);
    const farFromAnsweredPoi = turfPoint([-0.165, 51.45]);
    expect(booleanPointInPolygon(nearAnsweredPoi, region!)).toBe(false);
    expect(booleanPointInPolygon(farFromAnsweredPoi, region!)).toBe(true);
  });

  it("tentacleEliminationJsonForAnswer is undefined when out of reach", () => {
    expect(
      tentacleEliminationJsonForAnswer({
        anchor: [51.45, -0.15],
        radiusMeters: oneMileMeters,
        pois: [westMuseum, eastMuseum],
        answeredPoiId: "east",
        outOfReach: true,
        gameArea: sampleGameArea,
      }),
    ).toBeUndefined();
  });
});
