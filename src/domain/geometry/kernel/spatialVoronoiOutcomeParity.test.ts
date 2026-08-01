import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import { buildTentacleEliminationRegion } from "./tentacleRegions";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";
import { maskTopologyMatches, bboxFromGameArea } from "./maskTopology";
import type { GameAreaGeometry, LatLngTuple } from "./types";
import { voronoiCellSiteId } from "./voronoiCellSiteId";

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

const westSite = { id: "west", lat: 51.44, lng: -0.18 };
const eastSite = { id: "east", lat: 51.45, lng: -0.12 };
const northSite = { id: "north", lat: 51.5, lng: -0.15 };
const anchor: LatLngTuple = [51.45, -0.15];
const oneMileMeters = 1609.344;
const SIMPLIFY_TOLERANCE = 0.000012;

function sameNearestFromCells(
  seekerFeatureId: string,
  gameArea: GameAreaGeometry,
  cells: FeatureCollection,
): Feature<Polygon | MultiPolygon> | null {
  const seekerCell = cells.features.find(
    (cell) => voronoiCellSiteId(cell, ["featureId"]) === seekerFeatureId,
  );
  if (
    !seekerCell ||
    (seekerCell.geometry.type !== "Polygon" &&
      seekerCell.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }
  const gameFeature: Feature<Polygon | MultiPolygon> = {
    type: "Feature",
    properties: {},
    geometry: gameArea,
  };
  let clipped: Feature<Polygon | MultiPolygon> | null = null;
  try {
    const hit = intersect({
      type: "FeatureCollection",
      features: [gameFeature, seekerCell as Feature<Polygon | MultiPolygon>],
    });
    if (
      hit &&
      (hit.geometry.type === "Polygon" || hit.geometry.type === "MultiPolygon")
    ) {
      clipped = hit as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    clipped = null;
  }
  if (!clipped) {
    return null;
  }
  try {
    return simplify(clipped, {
      tolerance: SIMPLIFY_TOLERANCE,
      highQuality: true,
    }) as Feature<Polygon | MultiPolygon>;
  } catch {
    return clipped;
  }
}

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
    const siteInputs = [
      {
        lng: -0.18,
        lat: 51.44,
        properties: { featureId: "west" },
      },
      {
        lng: -0.12,
        lat: 51.45,
        properties: { featureId: "east" },
      },
      {
        lng: -0.15,
        lat: 51.5,
        properties: { featureId: "north" },
      },
    ];
    const tsCells = geoSpatialVoronoiFromSites(siteInputs);
    const wasmCells = await wasmBuildSpatialVoronoiFromSites(siteInputs);

    const tsRegion = sameNearestFromCells("west", sampleGameArea, tsCells);
    const wasmRegion = sameNearestFromCells("west", sampleGameArea, wasmCells);

    expect(tsRegion).not.toBeNull();
    expect(wasmRegion).not.toBeNull();
    expect(
      maskTopologyMatches(
        wasmRegion!,
        tsRegion!,
        bboxFromGameArea(sampleGameArea),
      ),
    ).toBe(true);
  });
});
