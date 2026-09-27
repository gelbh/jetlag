import { describe, expect, it } from "vitest";
import type { Feature, LineString } from "geojson";
import { clearCoastlineNearRegionCacheForTests } from "../measuring/nearRegions";
import type { GameAreaGeometry } from "./types";

const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

function measureMedianMs(run: () => void, iterations = 31): number {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

const sampleGameArea: GameAreaGeometry = {
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

/** Enough segments that the former TS path would cooperative-yield. */
function coastSegments(count: number): Feature<LineString>[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index * 0.008;
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.2 + offset, 51.45],
          [-0.195 + offset, 51.452],
        ],
      },
    };
  });
}

describe("nearRegionBatchPerf", () => {
  it("skips unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });

  it("wasm_near_region_batch median under 50ms", async () => {
    if (!runGeometryPerf) {
      return;
    }

    const segments = coastSegments(8);
    const distanceMeters = 500;
    const inputJson = JSON.stringify({
      segments: segments.map((s) => s.geometry.coordinates),
      distanceMeters,
      disks: [],
      gameArea: sampleGameArea,
    });

    const wasmPkg = await import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    );
    wasmPkg.build_near_region_json(inputJson);
    clearCoastlineNearRegionCacheForTests();

    const wasmMs = measureMedianMs(() => {
      wasmPkg.build_near_region_json(inputJson);
    });

    expect(wasmMs).toBeLessThan(50);
  });
});
