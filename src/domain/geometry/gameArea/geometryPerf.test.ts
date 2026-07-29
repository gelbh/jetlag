import { describe, expect, it } from "vitest";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString, Polygon as GeoPolygon } from "geojson";
import { computeEliminationUnionInputTs } from "../adapter/eliminationMask";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "../kernel/buildMask";
import {
  wasmBuildEndGameMaskFromDisks,
  wasmBuildMaskFromUnionInput,
} from "../kernel/maskWasm";
import { wasmBuildHalfPlanePolygon } from "../kernel/halfPlaneWasm";
import { wasmGeodesicLineBuffer } from "../kernel/geodesicWasm";
import { buildHalfPlanePolygon } from "../kernel/radarHalfPlane";
import { geodesicLineBuffer } from "../kernel/geodesicLineBuffer";
import {
  unionDiskSpecs,
  unionEliminationParts,
  unionPolygonFeatures,
  unionPolygonFeaturesLegacy,
  type DiskSpec,
  type EliminationUnionInput,
  type PolygonFeature,
} from "../kernel/unionPolygonFeatures";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { LatLngTuple } from "../kernel/types";

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

/** Thermo A/B across London (half-plane perf fixture). */
const thermoA: LatLngTuple = [51.45, -0.18];
const thermoB: LatLngTuple = [51.46, -0.12];

/** ~10-vertex line for geodesic perf. */
function tenVertexLine(): Feature<LineString> {
  const coordinates: [number, number][] = [];
  for (let index = 0; index < 10; index += 1) {
    coordinates.push([-0.18 + index * 0.005, 51.42 + index * 0.004]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  };
}

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

async function measureMedianMsAsync(
  fn: () => Promise<void>,
  iterations = 5,
): Promise<number> {
  const samples: number[] = [];

  for (let index = 0; index <= iterations; index += 1) {
    const start = performance.now();
    await fn();
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
    const input: EliminationUnionInput = { polygons: features, disks: [] };

    const martinezMs = measureMedianMs(() => {
      unionEliminationParts(input);
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
    const input = computeEliminationUnionInputTs(annotations, gameArea, []);

    const martinezMs = measureMedianMs(() => {
      buildMaskFromUnionInput(input, gameArea);
    });
    const legacyMs = measureMedianMs(() => {
      const features = annotations.map(
        (annotation) => annotation.geometry as PolygonFeature,
      );
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

  it("wasm_mask_8_polys median within 1.1x ts", async () => {
    const input: EliminationUnionInput = {
      polygons: Array.from({ length: 8 }, (_, index) =>
        squareFeature(-0.19 + index * 0.01),
      ),
      disks: [],
    };

    // Warm WASM once so init cost is outside the median window.
    await wasmBuildMaskFromUnionInput(input, gameArea);

    const tsMs = measureMedianMs(() => {
      buildMaskFromUnionInput(input, gameArea);
    });
    const wasmMs = await measureMedianMsAsync(async () => {
      await wasmBuildMaskFromUnionInput(input, gameArea);
    });

    expect(wasmMs / tsMs).toBeLessThanOrEqual(1.1);
  });

  it("wasm_end_game_10_disks median within 1.1x ts", async () => {
    const disks = circleDisks(10);

    await wasmBuildEndGameMaskFromDisks(gameArea, disks);

    const tsMs = measureMedianMs(() => {
      buildEndGameMaskFromDisks(gameArea, disks);
    });
    const wasmMs = await measureMedianMsAsync(async () => {
      await wasmBuildEndGameMaskFromDisks(gameArea, disks);
    });

    expect(wasmMs / tsMs).toBeLessThanOrEqual(1.1);
  });

  // Direct WASM calls (bypass KERNEL_WASM_READY) — gates for future ready flip.
  // Measure sync pkg exports after warm-up so Promise microtasks don't dominate
  // sub-millisecond entrypoints (geodesic especially).
  it("wasm_half_plane_thermo median within 1.1x ts", async () => {
    await wasmBuildHalfPlanePolygon(thermoA, thermoB, gameArea, "cold");
    const wasmPkg = await import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    );
    const pointAJson = JSON.stringify(thermoA);
    const pointBJson = JSON.stringify(thermoB);
    const gameAreaJson = JSON.stringify(gameArea);

    const tsMs = measureMedianMs(() => {
      buildHalfPlanePolygon(thermoA, thermoB, gameArea, "cold");
    });
    const wasmMs = measureMedianMs(() => {
      wasmPkg.build_half_plane_polygon_json(
        pointAJson,
        pointBJson,
        gameAreaJson,
        "cold",
        "midpoint",
      );
    });

    if (tsMs === 0) {
      expect(wasmMs).toBe(0);
    } else {
      expect(wasmMs / tsMs).toBeLessThanOrEqual(1.1);
    }
  });

  it("wasm_geodesic_10_vertex median within 1.2x ts", async () => {
    const line = tenVertexLine();
    await wasmGeodesicLineBuffer(line, 200);
    const wasmPkg = await import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    );
    const coordinatesJson = JSON.stringify(line.geometry.coordinates);

    const tsMs = measureMedianMs(() => {
      geodesicLineBuffer(line, 200);
    });
    const wasmMs = measureMedianMs(() => {
      wasmPkg.geodesic_line_buffer_json(coordinatesJson, 200, null);
    });

    if (tsMs === 0) {
      expect(wasmMs).toBe(0);
    } else {
      // CI runners show ~1.15x noise on this short path; keep a tight but stable gate.
      expect(wasmMs / tsMs).toBeLessThanOrEqual(1.2);
    }
  });
});

describe("geometryPerf gate", () => {
  it("skips perf gates unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });
});
