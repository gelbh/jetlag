import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCircle from "@turf/circle";
import turfDestination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea } from "../../map/annotations";
import { buildLocationNearRegion, distanceBetweenPoints } from "./nearRegions";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.3, 51.3],
      [0.1, 51.3],
      [0.1, 51.6],
      [-0.3, 51.6],
      [-0.3, 51.3],
    ],
  ],
};

describe("buildLocationNearRegion disk steps", () => {
  it("includes a geodesic-inside point that a 16-step chord would exclude", () => {
    const target: [number, number] = [51.45, -0.15];
    const distanceMeters = 4_147;
    const center = turfPoint([-0.15, 51.45]);

    // Midway between two vertices of a regular n-gon; chords cut inside the true circle.
    const bearingMidChordDegrees = (360 / 16) / 2;
    const coarseChordFraction = Math.cos(Math.PI / 16);
    const probeFraction = (coarseChordFraction + Math.cos(Math.PI / 64)) / 2;
    const probe = turfDestination(
      center,
      (distanceMeters * probeFraction) / 1000,
      bearingMidChordDegrees,
      { units: "kilometers" },
    );
    const probeLngLat = probe.geometry.coordinates;
    const probeLatLng: [number, number] = [probeLngLat[1], probeLngLat[0]];

    expect(distanceBetweenPoints(target, probeLatLng)).toBeLessThan(distanceMeters);

    const coarseDisk = turfCircle(center, distanceMeters / 1000, {
      steps: 16,
      units: "kilometers",
    });
    expect(booleanPointInPolygon(probe, coarseDisk)).toBe(false);

    const nearRegion = buildLocationNearRegion(
      target,
      distanceMeters,
      sampleGameArea,
    );
    expect(nearRegion).not.toBeNull();
    expect(booleanPointInPolygon(probe, nearRegion!)).toBe(true);
  });
});
