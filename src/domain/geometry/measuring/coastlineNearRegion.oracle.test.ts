import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { GameArea } from "../../map/annotations";
import { bearingDegrees, destinationPoint } from "../core/geodesicPrimitives";
import type { LatLngTuple } from "../gameArea/geometryCore";
import {
  assertCoastlineNearRegionOracle,
  buildCoastlineNearRegionDistanceThreshold,
  coastlineNearRegionOracleEpsilonMeters,
} from "./coastlineNearRegion";
import { buildCoastlineEliminationRegion } from "./eliminationRegions";
import { loadXwxzRegionInputFixture } from "./loadXwxzRegionInput";
import {
  buildCoastlineNearRegionUnionBufferForTests,
  clearCoastlineNearRegionCacheForTests,
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
} from "./nearRegions";

function coastlineSeekerRayProbeBeyondRadius(
  nearestCoastLatLng: LatLngTuple,
  seekerLatLng: LatLngTuple,
  radiusMeters: number,
  beyondMeters: number,
): Feature<Point> {
  const bearing = bearingDegrees(nearestCoastLatLng, seekerLatLng);
  const [lat, lng] = destinationPoint(nearestCoastLatLng, radiusMeters + beyondMeters, bearing);
  return turfPoint([lng, lat]);
}

const fixtureGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.28, 51.32],
      [0.02, 51.32],
      [0.02, 51.58],
      [-0.28, 51.58],
      [-0.28, 51.32],
    ],
  ],
};

/** Primary shore + short stray segment (buffer-union inflation class). */
const fixtureSegments: Feature<LineString>[] = [
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-0.22, 51.4],
        [-0.08, 51.4],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-0.04, 51.54],
        [-0.035, 51.545],
      ],
    },
  },
];

const fixtureRadiusMeters = 4_567;
const seekerLatLng: [number, number] = [51.45, -0.15];

function hasCoastlineNearRegionOracleViolation(
  polygon: Feature<Polygon | MultiPolygon>,
  prepared: ReturnType<typeof prepareMeasuringLineSegments>,
  radiusMeters: number,
  gameArea: GameArea,
  epsilonMeters: number,
  divisions: number,
): boolean {
  try {
    assertCoastlineNearRegionOracle(
      polygon,
      prepared,
      radiusMeters,
      gameArea,
      epsilonMeters,
      divisions,
    );
    return false;
  } catch {
    return true;
  }
}

describe("coastline near region oracle", () => {
  it("passes distance-threshold output and rejects union-buffer inflation", async () => {
    const prepared = prepareMeasuringLineSegments(fixtureSegments, fixtureGameArea);
    const divisions = 24;
    const epsilon = coastlineNearRegionOracleEpsilonMeters(fixtureGameArea, divisions);

    const distanceThresholdRegion = await buildCoastlineNearRegionDistanceThreshold(
      fixtureSegments,
      fixtureRadiusMeters,
      fixtureGameArea,
      { divisions },
    );

    expect(distanceThresholdRegion).not.toBeNull();
    assertCoastlineNearRegionOracle(
      distanceThresholdRegion!,
      prepared,
      fixtureRadiusMeters,
      fixtureGameArea,
      epsilon,
      divisions,
    );

    const bufferRegion = await buildCoastlineNearRegionUnionBufferForTests(
      fixtureSegments,
      fixtureRadiusMeters,
      fixtureGameArea,
    );

    expect(bufferRegion).not.toBeNull();
    expect(
      hasCoastlineNearRegionOracleViolation(
        bufferRegion!,
        prepared,
        fixtureRadiusMeters,
        fixtureGameArea,
        epsilon,
        divisions,
      ),
    ).toBe(true);

    const nearest = nearestPointToCoastlines(seekerLatLng, prepared.segments, prepared);
    expect(nearest).not.toBeNull();

    const probe = coastlineSeekerRayProbeBeyondRadius(
      nearest!.point,
      seekerLatLng,
      fixtureRadiusMeters,
      500,
    );

    expect(booleanPointInPolygon(probe, distanceThresholdRegion!)).toBe(false);
  });

  it("XWXZ regression: oracle, further band, seeker-ray probe", async () => {
    clearCoastlineNearRegionCacheForTests();
    const fixture = loadXwxzRegionInputFixture();
    const { gameArea, measuringCoastSegments, measuringDistanceMeters, zoneCenter, seekerAnchor } =
      fixture;
    const prepared = prepareMeasuringLineSegments(measuringCoastSegments, gameArea);
    const divisions = 24;
    const epsilon = coastlineNearRegionOracleEpsilonMeters(gameArea, divisions);

    const nearRegion = await buildCoastlineNearRegionDistanceThreshold(
      measuringCoastSegments,
      measuringDistanceMeters,
      gameArea,
      { divisions },
    );
    expect(nearRegion).not.toBeNull();
    assertCoastlineNearRegionOracle(
      nearRegion!,
      prepared,
      measuringDistanceMeters,
      gameArea,
      epsilon,
      divisions,
    );

    const bufferRegion = await buildCoastlineNearRegionUnionBufferForTests(
      measuringCoastSegments,
      measuringDistanceMeters,
      gameArea,
    );
    expect(bufferRegion).not.toBeNull();

    const furtherElimination = await buildCoastlineEliminationRegion(
      measuringCoastSegments,
      measuringDistanceMeters,
      gameArea,
      "further",
      nearRegion,
    );
    expect(furtherElimination).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([zoneCenter[1], zoneCenter[0]]), furtherElimination!),
    ).toBe(true);

    const nearestSeeker = nearestPointToCoastlines(seekerAnchor, prepared.segments, prepared);
    expect(nearestSeeker).not.toBeNull();
    const inflatedProbe = coastlineSeekerRayProbeBeyondRadius(
      nearestSeeker!.point,
      seekerAnchor,
      measuringDistanceMeters,
      500,
    );
    expect(booleanPointInPolygon(inflatedProbe, nearRegion!)).toBe(false);
    expect(booleanPointInPolygon(inflatedProbe, bufferRegion!)).toBe(true);
  });
});
