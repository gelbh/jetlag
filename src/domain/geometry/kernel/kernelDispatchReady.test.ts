import { describe, expect, it } from "vitest";
import area from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";
import { dispatchSpatialVoronoi } from "./voronoiKernelRunner";
import { wasmBuildTentacleEliminationRegion } from "./tentacleWasm";
import { runTentacleEliminationRegion } from "./tentacleKernelRunner";
import type { GameAreaGeometry, LatLngTuple } from "./types";

const sampleGameArea: GameAreaGeometry = {
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

const westSite = { id: "west", lat: 51.45, lng: -0.18 };
const eastSite = { id: "east", lat: 51.45, lng: -0.12 };
const anchor: LatLngTuple = [51.45, -0.15];
const oneMileMeters = 1609.344;

describe("kernel dispatch ready", () => {
  it("mode wasm + spatialVoronoi ready → FeatureCollection with site count", async () => {
    const sites = [
      { lng: -0.18, lat: 51.45, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
    ];
    const result = await dispatchSpatialVoronoi(sites);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(2);
  });

  it("mode wasm + tentacleEliminationRegion ready → WASM via runner", async () => {
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const params = {
      anchor,
      radiusMeters: oneMileMeters,
      sites,
      answeredSiteId: "east",
      gameArea: sampleGameArea,
      voronoiCells: cells,
    };
    const expected = await wasmBuildTentacleEliminationRegion(
      params.anchor,
      params.radiusMeters,
      params.sites,
      params.answeredSiteId,
      params.gameArea,
      params.voronoiCells,
    );
    const result = await runTentacleEliminationRegion(params);
    expect(result).not.toBeNull();
    expect(result?.geometry.type).toMatch(/Polygon|MultiPolygon/);

    const westOfBisector = turfPoint([-0.165, 51.45]);
    const eastOfBisector = turfPoint([-0.135, 51.45]);
    expect(booleanPointInPolygon(westOfBisector, result!)).toBe(true);
    expect(booleanPointInPolygon(eastOfBisector, result!)).toBe(false);

    if (expected) {
      expect(area(result!)).toBeGreaterThan(0);
    }
  });

  it("tentacle runner parity: shaded disk excludes answered site cell", async () => {
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const region = await runTentacleEliminationRegion({
      anchor,
      radiusMeters: oneMileMeters,
      sites,
      answeredSiteId: "east",
      gameArea: sampleGameArea,
      voronoiCells: cells,
    });

    expect(region).not.toBeNull();
    const nearAnswered = turfPoint([-0.125, 51.45]);
    const farFromAnswered = turfPoint([-0.165, 51.45]);
    expect(booleanPointInPolygon(nearAnswered, region!)).toBe(false);
    expect(booleanPointInPolygon(farFromAnswered, region!)).toBe(true);
  });
});

describe("wasmBuildTentacleEliminationRegion kernel", () => {
  it("returns null when fewer than two sites", async () => {
    const cells = await wasmBuildSpatialVoronoiFromSites([
      { lng: -0.18, lat: 51.45, properties: { poiId: "west" } },
    ]);
    expect(
      await wasmBuildTentacleEliminationRegion(
        anchor,
        oneMileMeters,
        [westSite],
        "west",
        sampleGameArea,
        cells,
      ),
    ).toBeNull();
  });

  it("produces positive-area shading for two sites", async () => {
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const region = await wasmBuildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      sampleGameArea,
      cells,
    ) as Feature<Polygon | MultiPolygon>;

    expect(area(region)).toBeGreaterThan(0);
  });
});
