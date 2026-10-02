import buffer from "@turf/buffer";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfDestination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it, vi } from "vitest";

/** Coarse buffers overshoot true {dist ≤ R} membership (XWXZ inflation class). */
vi.mock("./geodesicLineBuffer", () => ({
  dispatchGeodesicLineBuffer: vi.fn(async (segment: Feature<LineString>, distanceMeters: number) => {
    const buffered = buffer(segment, (distanceMeters * 1.35) / 1000, {
      units: "kilometers",
      steps: 8,
    });
    if (buffered.geometry.type !== "Polygon" && buffered.geometry.type !== "MultiPolygon") {
      return null;
    }
    return buffered as Feature<Polygon>;
  }),
}));

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
import type { GameArea } from "../../map/annotations";
import {
  assertCoastlineNearRegionOracle,
  buildCoastlineNearRegionDistanceThreshold,
  coastlineNearRegionOracleEpsilonMeters,
} from "./coastlineNearRegion";
import {
  buildCoastlineNearRegionUnionBufferForTests,
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
} from "./nearRegions";

/** Minimal play area (Dublin-scale bbox subset). */
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

    const seeker = turfPoint([seekerLatLng[1], seekerLatLng[0]]);
    const coastPoint = turfPoint([nearest!.point[1], nearest!.point[0]]);
    const fromLng = coastPoint.geometry.coordinates[0]!;
    const fromLat = coastPoint.geometry.coordinates[1]!;
    const toLng = seeker.geometry.coordinates[0]!;
    const toLat = seeker.geometry.coordinates[1]!;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const fromLatRad = (fromLat * Math.PI) / 180;
    const toLatRad = (toLat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(toLatRad);
    const x =
      Math.cos(fromLatRad) * Math.sin(toLatRad) -
      Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
    const awayFromCoastBearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const probe = turfDestination(seeker, 500 / 1000, awayFromCoastBearing, {
      units: "kilometers",
    });

    expect(booleanPointInPolygon(probe, distanceThresholdRegion!)).toBe(false);
  });
});
