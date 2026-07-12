import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import {
  unionDiskSpecs,
  unionEliminationParts,
  unionPolygonFeatures,
  unionPolygonFeaturesLegacy,
  type DiskSpec,
  type PolygonFeature,
} from "./unionPolygonFeatures";

function squareFeature(west: number): Feature<GeoPolygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, 51.42],
          [west + 0.03, 51.42],
          [west + 0.03, 51.48],
          [west, 51.48],
          [west, 51.42],
        ],
      ],
    },
  };
}

function sampleGridPoints(
  west: number,
  east: number,
  south: number,
  north: number,
  steps: number,
): ReturnType<typeof turfPoint>[] {
  const points: ReturnType<typeof turfPoint>[] = [];
  const lngStep = (east - west) / steps;
  const latStep = (north - south) / steps;

  for (let lngIndex = 0; lngIndex <= steps; lngIndex += 1) {
    for (let latIndex = 0; latIndex <= steps; latIndex += 1) {
      points.push(
        turfPoint([west + lngIndex * lngStep, south + latIndex * latStep]),
      );
    }
  }

  return points;
}

function assertMaskParity(
  candidate: PolygonFeature | null,
  baseline: PolygonFeature | null,
  west: number,
  east: number,
  south: number,
  north: number,
): void {
  expect(candidate).not.toBeNull();
  expect(baseline).not.toBeNull();

  const points = sampleGridPoints(west, east, south, north, 12);

  for (const sample of points) {
    expect(booleanPointInPolygon(sample, candidate!)).toBe(
      booleanPointInPolygon(sample, baseline!),
    );
  }
}

function legacyDiskUnion(disks: DiskSpec[]): PolygonFeature | null {
  const circles = disks.map((disk) =>
    turfCircle(turfPoint([disk.center[1], disk.center[0]]), disk.radiusMeters / 1000, {
      steps: 64,
      units: "kilometers",
    }),
  ) as PolygonFeature[];

  return unionPolygonFeaturesLegacy(circles);
}

describe("unionPolygonFeatures parity", () => {
  it("matches legacy turf union for overlapping squares", () => {
    const features = [squareFeature(-0.19), squareFeature(-0.16)];
    const candidate = unionPolygonFeatures(features);
    const baseline = unionPolygonFeaturesLegacy(features);

    assertMaskParity(candidate, baseline, -0.2, -0.1, 51.4, 51.5);
  });

  it("matches legacy turf union for ten mixed polygons", () => {
    const features = Array.from({ length: 10 }, (_, index) =>
      squareFeature(-0.19 + index * 0.008),
    );
    const candidate = unionPolygonFeatures(features);
    const baseline = unionPolygonFeaturesLegacy(features);

    assertMaskParity(candidate, baseline, -0.2, -0.1, 51.4, 51.5);
  });

  it("matches legacy union for mixed disks and polygons", () => {
    const disks: DiskSpec[] = [
      { center: [51.45, -0.18], radiusMeters: 800 },
      { center: [51.46, -0.14], radiusMeters: 600 },
    ];
    const polygons = [squareFeature(-0.17), squareFeature(-0.13)];

    const candidate = unionEliminationParts({ polygons, disks });
    const baseline = unionPolygonFeaturesLegacy([
      ...polygons,
      ...(disks.map((disk) =>
        turfCircle(
          turfPoint([disk.center[1], disk.center[0]]),
          disk.radiusMeters / 1000,
          { steps: 64, units: "kilometers" },
        ),
      ) as PolygonFeature[]),
    ]);

    assertMaskParity(candidate, baseline, -0.2, -0.1, 51.4, 51.5);
  });

  it("matches turf-circle union baseline for twenty disks", () => {
    const disks: DiskSpec[] = Array.from({ length: 20 }, (_, index) => ({
      center: [51.42 + (index % 5) * 0.015, -0.19 + Math.floor(index / 5) * 0.015] as [
        number,
        number,
      ],
      radiusMeters: 350 + (index % 3) * 50,
    }));

    const candidate = unionDiskSpecs(disks);
    const baseline = legacyDiskUnion(disks);

    assertMaskParity(candidate, baseline, -0.2, -0.1, 51.4, 51.5);
  });
});

describe("unionPolygonFeatures smoke", () => {
  it("returns a polygon for overlapping squares", () => {
    const features = [squareFeature(-0.19), squareFeature(-0.16)];
    const combined = unionPolygonFeatures(features);

    expect(combined).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!),
    ).toBe(true);
    expect(
      booleanPointInPolygon(turfPoint([-0.155, 51.45]), combined!),
    ).toBe(true);
  });
});
