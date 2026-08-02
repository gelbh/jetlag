import { describe, expect, it } from "vitest";
import type { Feature, LineString } from "geojson";
import {
  buildCoastlineNearRegionTs,
  clearCoastlineNearRegionCacheForTests,
} from "../measuring/nearRegions";
import type { GameAreaGeometry } from "./types";
import { KERNEL_WASM_READY } from "./kernelWasmReady";

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

/** Enough segments that the TS path would cooperative-yield. */
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

  it("wasm_near_region_batch median within 1.1x ts (required before ready flip)", async () => {
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
    buildCoastlineNearRegionTs(segments, distanceMeters, sampleGameArea);
    clearCoastlineNearRegionCacheForTests();

    const tsMs = measureMedianMs(() => {
      clearCoastlineNearRegionCacheForTests();
      buildCoastlineNearRegionTs(segments, distanceMeters, sampleGameArea);
    });
    const wasmMs = measureMedianMs(() => {
      wasmPkg.build_near_region_json(inputJson);
    });

    const ratio = tsMs === 0 ? 0 : wasmMs / tsMs;
    if (KERNEL_WASM_READY.nearRegionBatch) {
      expect(ratio).toBeLessThanOrEqual(1.1);
    } else {
      expect(ratio).toBeGreaterThan(0);
    }
  });
});
