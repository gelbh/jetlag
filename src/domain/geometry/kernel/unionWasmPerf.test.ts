import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PolygonFeature } from "./types";

const pkgEntry = resolve(
  import.meta.dirname,
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);
const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

function square(west: number): PolygonFeature {
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

/** Same order as mask 8-poly gate (`-0.19 + index * 0.01`). */
function eightSquares(): PolygonFeature[] {
  return Array.from({ length: 8 }, (_, index) => square(-0.19 + index * 0.01));
}

async function measureMedianMsAsync(fn: () => Promise<void>, iterations = 5): Promise<number> {
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

describe("union polygon wasm perf gate", () => {
  it("fails closed when GEOMETRY_PERF=1 without wasm pkg", () => {
    if (runGeometryPerf && !wasmPkgReady) {
      throw new Error(
        "GEOMETRY_PERF=1 requires crates/jetlag-geometry-kernel/pkg (run wasm-pack build)",
      );
    }
    expect(runGeometryPerf || true).toBe(true);
  });
});

describe.skipIf(!wasmPkgReady || !runGeometryPerf)("union polygon wasm perf", () => {
  beforeAll(async () => {
    const { wasmUnionPolygonFeatures } = await import("./unionWasm");
    await wasmUnionPolygonFeatures(eightSquares());
  }, 60_000);

  it("wasm 8-square batch median under 40ms", async () => {
    const { wasmUnionPolygonFeatures } = await import("./unionWasm");
    const features = eightSquares();
    const wasmMs = await measureMedianMsAsync(async () => {
      await wasmUnionPolygonFeatures(features);
    });
    expect(wasmMs).toBeLessThan(40);
  });
});
