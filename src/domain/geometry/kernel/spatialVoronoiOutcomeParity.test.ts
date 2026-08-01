import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { buildTentacleEliminationRegion } from "./tentacleRegions";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";
import { maskTopologyMatches, bboxFromGameArea } from "./maskTopology";
import {
  buildSameNearestRegion,
} from "../measuring/matchingGeometry";
import type { GameAreaGeometry, LatLngTuple } from "./types";
import type { MatchingFeature } from "../../geo/types";
import type { GameArea } from "../../map/annotations";

const sampleGameArea: GameAreaGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-0.25, 51.4],
      [-0.05, 51.4],
      [-0.05, 51.55],
      [-0.25, 51.55],
      [-0.25, 51.4],
    ],
  ],
};

const gameAreaAnnotation: GameArea = {
  type: "Polygon",
  coordinates: sampleGameArea.coordinates,
};

const westSite = { id: "west", lat: 51.44, lng: -0.18 };
const eastSite = { id: "east", lat: 51.45, lng: -0.12 };
const northSite = { id: "north", lat: 51.5, lng: -0.15 };
const anchor: LatLngTuple = [51.45, -0.15];
const oneMileMeters = 1609.344;

describe("spatialVoronoiOutcomeParity", () => {
  it("tentacle elimination outcomes stay topology-close vs TS Voronoi cells", async () => {
    const sites = [westSite, eastSite, northSite];
    const siteInputs = sites.map((s) => ({
      lng: s.lng,
      lat: s.lat,
      properties: { poiId: s.id },
    }));
    const tsCells = geoSpatialVoronoiFromSites(siteInputs);
    const wasmCells = await wasmBuildSpatialVoronoiFromSites(siteInputs);

    const tsRegion = buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      sampleGameArea,
      tsCells,
    );
    const wasmRegion = buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      sampleGameArea,
      wasmCells,
    );

    expect(tsRegion).not.toBeNull();
    expect(wasmRegion).not.toBeNull();
    expect(
      maskTopologyMatches(
        wasmRegion as Feature<Polygon | MultiPolygon>,
        tsRegion as Feature<Polygon | MultiPolygon>,
        bboxFromGameArea(sampleGameArea),
      ),
    ).toBe(true);

    const westOfBisector = turfPoint([-0.17, 51.45]);
    expect(booleanPointInPolygon(westOfBisector, wasmRegion!)).toBe(true);
  });

  it("matching same-nearest outcomes stay topology-close vs TS Voronoi cells", async () => {
    const features: MatchingFeature[] = [
      {
        id: "west",
        name: "West",
        point: [51.44, -0.18],
        inPlayArea: true,
      },
      {
        id: "east",
        name: "East",
        point: [51.45, -0.12],
        inPlayArea: true,
      },
      {
        id: "north",
        name: "North",
        point: [51.5, -0.15],
        inPlayArea: true,
      },
    ];

    // Force TS path for baseline by calling geometry with mode override via
    // localStorage is brittle in unit tests — compare TS cells→region vs WASM
    // cells→region using the same matching clip helpers.
    const { clearVoronoiCellCacheForTests } = await import(
      "../voronoi/voronoiCellCache"
    );
    clearVoronoiCellCacheForTests();

    // Baseline: sync TS cells through matching by temporarily using ts mode
    const prev =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("jl.geometry.maskKernel")
        : null;
    try {
      localStorage.setItem("jl.geometry.maskKernel", "ts");
      clearVoronoiCellCacheForTests();
      const tsRegion = await buildSameNearestRegion(
        features,
        "west",
        gameAreaAnnotation,
      );

      localStorage.setItem("jl.geometry.maskKernel", "wasm");
      clearVoronoiCellCacheForTests();
      const wasmRegion = await buildSameNearestRegion(
        features,
        "west",
        gameAreaAnnotation,
      );

      expect(tsRegion).not.toBeNull();
      expect(wasmRegion).not.toBeNull();
      expect(
        maskTopologyMatches(
          wasmRegion!,
          tsRegion!,
          bboxFromGameArea(sampleGameArea),
        ),
      ).toBe(true);
    } finally {
      if (prev == null) {
        localStorage.removeItem("jl.geometry.maskKernel");
      } else {
        localStorage.setItem("jl.geometry.maskKernel", prev);
      }
      clearVoronoiCellCacheForTests();
    }
  });
});
