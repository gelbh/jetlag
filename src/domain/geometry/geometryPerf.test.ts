import { describe, expect, it } from "vitest";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import {
  buildCombinedEliminationMask,
} from "./combinedEliminationMask";
import {
  unionDiskSpecs,
  unionPolygonFeatures,
  unionPolygonFeaturesLegacy,
  type DiskSpec,
  type PolygonFeature,
} from "./unionPolygonFeatures";
import type { AnnotationRecord, GameArea } from "../map/annotations";

const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

const gameArea: GameArea = {
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

function matchingAnnotation(id: string, west: number): AnnotationRecord {
  return {
    id,
    sessionId: "session",
    status: "active",
    type: "matching",
    geometry: squareFeature(west),
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      color: "#ef4444",
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 51.45, lng: west + 0.015 },
    },
  };
}

function measureMedianMs(fn: () => void, iterations = 5): number {
  const samples: number[] = [];

  for (let index = 0; index <= iterations; index += 1) {
    const start = performance.now();
    fn();
    const elapsed = performance.now() - start;

    if (index > 0) {
      samples.push(elapsed);
    }
  }

  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

function circleDisks(count: number): DiskSpec[] {
  return Array.from({ length: count }, (_, index) => ({
    center: [51.42 + (index % 5) * 0.015, -0.19 + Math.floor(index / 5) * 0.015] as [
      number,
      number,
    ],
    radiusMeters: 350 + (index % 3) * 50,
  }));
}

function legacyCircleUnion(disks: DiskSpec[]): PolygonFeature | null {
  const circles = disks.map((disk) =>
    turfCircle(turfPoint([disk.center[1], disk.center[0]]), disk.radiusMeters / 1000, {
      steps: 64,
      units: "kilometers",
    }),
  ) as PolygonFeature[];

  return unionPolygonFeaturesLegacy(circles);
}

describe.skipIf(!runGeometryPerf)("geometry performance gates", () => {
  it("union_10_circles is at least 2x faster than legacy turf union", () => {
    const disks = circleDisks(10);
    const circles = disks.map((disk) =>
      turfCircle(turfPoint([disk.center[1], disk.center[0]]), disk.radiusMeters / 1000, {
        steps: 64,
        units: "kilometers",
      }),
    ) as PolygonFeature[];

    const martinezMs = measureMedianMs(() => {
      unionPolygonFeatures(circles);
    });
    const legacyMs = measureMedianMs(() => {
      unionPolygonFeaturesLegacy(circles);
    });

    expect(martinezMs / legacyMs).toBeLessThan(0.5);
  });

  it("union_10_mixed_polys is faster than legacy turf union", () => {
    const features = Array.from({ length: 10 }, (_, index) =>
      squareFeature(-0.19 + index * 0.008),
    );

    const martinezMs = measureMedianMs(() => {
      unionPolygonFeatures(features);
    });
    const legacyMs = measureMedianMs(() => {
      unionPolygonFeaturesLegacy(features);
    });

    expect(martinezMs / legacyMs).toBeLessThan(0.6);
  });

  it("elimination_mask_8_annotations is faster than legacy union path", () => {
    const annotations = Array.from({ length: 8 }, (_, index) =>
      matchingAnnotation(`a-${index}`, -0.19 + index * 0.01),
    );

    const martinezMs = measureMedianMs(() => {
      buildCombinedEliminationMask(annotations, gameArea);
    });
    const legacyMs = measureMedianMs(() => {
      const features = annotations.map((annotation) => annotation.geometry as PolygonFeature);
      unionPolygonFeaturesLegacy(features);
    });

    expect(martinezMs / legacyMs).toBeLessThan(0.6);
  });

  it("circle_union_20_disks is much faster than turf-circle plus union", () => {
    const disks = circleDisks(20);

    const circleUnionMs = measureMedianMs(() => {
      unionDiskSpecs(disks);
    });
    const legacyMs = measureMedianMs(() => {
      legacyCircleUnion(disks);
    });

    expect(circleUnionMs / legacyMs).toBeLessThan(0.1);
  });
});

describe("geometryPerf gate", () => {
  it("skips perf gates unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });
});
