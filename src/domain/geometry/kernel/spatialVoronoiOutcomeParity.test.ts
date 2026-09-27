import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import { wasmBuildTentacleEliminationRegion } from "./tentacleWasm";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";
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
  it("tentacle elimination keeps west-of-bisector for east answer", async () => {
    const sites = [westSite, eastSite, northSite];
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
    );

    expect(region).not.toBeNull();
    const westOfBisector = turfPoint([-0.17, 51.45]);
    expect(booleanPointInPolygon(westOfBisector, region!)).toBe(true);
  });

  it("matching same-nearest clips seeker cell into the game area", async () => {
    const cells = await wasmBuildSpatialVoronoiFromSites([
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
    ]);
    const region = sameNearestFromCells("west", sampleGameArea, cells);

    expect(region).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([westSite.lng, westSite.lat]), region!),
    ).toBe(true);
  });
});
