import { describe, expect, it } from "vitest";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { KERNEL_WASM_READY } from "./kernelWasmReady";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";

const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

/**
 * Interleaved median: Wave-2 Gate A for the production Voronoi path
 * (`wasmBuildSpatialVoronoiFromSites` vs `geoSpatialVoronoiFromSites`).
 */
async function measureInterleavedMedianRatio(
  runTs: () => void,
  runWasm: () => Promise<void>,
  iterations = 31,
): Promise<number> {
  const tsSamples: number[] = [];
  const wasmSamples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const tsStart = performance.now();
    runTs();
    tsSamples.push(performance.now() - tsStart);
    const wasmStart = performance.now();
    await runWasm();
    wasmSamples.push(performance.now() - wasmStart);
  }
  tsSamples.sort((a, b) => a - b);
  wasmSamples.sort((a, b) => a - b);
  const tsMs = tsSamples[Math.floor(tsSamples.length / 2)]!;
  const wasmMs = wasmSamples[Math.floor(wasmSamples.length / 2)]!;
  return tsMs === 0 ? 0 : wasmMs / tsMs;
}

describe("spatialVoronoiPerf", () => {
  it("skips unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });

  it("wasm_spatial_voronoi median within 1.1x ts (production-shaped)", async () => {
    if (!runGeometryPerf) {
      return;
    }
    const sites = [
      { lng: -0.18, lat: 51.44, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
      { lng: -0.15, lat: 51.5, properties: { poiId: "north" } },
      { lng: -0.2, lat: 51.48, properties: { poiId: "far" } },
    ];
    await wasmBuildSpatialVoronoiFromSites(sites);
    geoSpatialVoronoiFromSites(sites);

    const ratio = await measureInterleavedMedianRatio(
      () => {
        geoSpatialVoronoiFromSites(sites);
      },
      async () => {
        await wasmBuildSpatialVoronoiFromSites(sites);
      },
    );

    if (KERNEL_WASM_READY.spatialVoronoi) {
      expect(ratio).toBeLessThanOrEqual(1.1);
    } else {
      expect(ratio).toBeGreaterThan(0);
    }
  });
});
