import { beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { assertPolygonTopologyParity } from "./parity";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { buildTentacleEliminationRegion } from "./tentacleRegions";
import type { GameAreaGeometry, LatLngTuple } from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

const gameArea: GameAreaGeometry = {
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

const topologyBbox = {
  west: -0.199,
  east: -0.101,
  south: 51.401,
  north: 51.499,
};

const westSite = { id: "west", lat: 51.45, lng: -0.18 };
const eastSite = { id: "east", lat: 51.45, lng: -0.12 };
const anchor: LatLngTuple = [51.45, -0.15];
const oneMileMeters = 1609.344;

describe.skipIf(!wasmPkgReady)("tentacle wasm parity", () => {
  let wasmBuildTentacleEliminationRegion: typeof import("./tentacleWasm").wasmBuildTentacleEliminationRegion;
  let wasmBuildTentaclePoiAnswerEliminationRegion: typeof import("./tentacleWasm").wasmBuildTentaclePoiAnswerEliminationRegion;

  beforeAll(async () => {
    const wasm = await import("./tentacleWasm");
    wasmBuildTentacleEliminationRegion = wasm.wasmBuildTentacleEliminationRegion;
    wasmBuildTentaclePoiAnswerEliminationRegion =
      wasm.wasmBuildTentaclePoiAnswerEliminationRegion;
    const sites = [westSite, eastSite];
    const cells = geoSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    await wasmBuildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
  }, 60_000);

  it("matches TS topology on two-site tentacle elimination", async () => {
    const sites = [westSite, eastSite];
    const cells = geoSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const ts = buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    const wasm = await wasmBuildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);

    expect(wasm).not.toBeNull();
    const westOfBisector = turfPoint([-0.165, 51.45]);
    const eastOfBisector = turfPoint([-0.135, 51.45]);
    expect(booleanPointInPolygon(westOfBisector, wasm!)).toBe(true);
    expect(booleanPointInPolygon(eastOfBisector, wasm!)).toBe(false);
  });

  it("matches TS topology on POI-answer tentacle elimination", async () => {
    const sites = [westSite, eastSite];
    const cells = geoSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const { buildTentaclePoiAnswerEliminationRegion } = await import(
      "./tentacleRegions"
    );
    const ts = buildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    const wasm = await wasmBuildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });
});
