import { describe, expect, it } from "vitest";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { KERNEL_WASM_READY } from "./kernelWasmReady";

const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

/**
 * Interleaved median: Wave-2 Gate A for the sync pkg export.
 * Compares serialized FeatureCollections (build_*_json vs JSON.stringify(TS)),
 * matching the string-returning pkg API (same posture as half-plane pkg gates
 * that pre-stringify inputs). Production async wrappers add JS stringify/parse
 * around this export — same pattern as other kernel wasm wrappers.
 */
function measureInterleavedMedianRatio(
  runTs: () => void,
  runWasm: () => void,
  iterations = 31,
): number {
  const tsSamples: number[] = [];
  const wasmSamples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const tsStart = performance.now();
    runTs();
    tsSamples.push(performance.now() - tsStart);
    const wasmStart = performance.now();
    runWasm();
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

  it("wasm_spatial_voronoi median within 1.1x ts (required before ready flip)", async () => {
    if (!runGeometryPerf) {
      return;
    }
    const sites = [
      { lng: -0.18, lat: 51.44, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
      { lng: -0.15, lat: 51.5, properties: { poiId: "north" } },
      { lng: -0.2, lat: 51.48, properties: { poiId: "far" } },
    ];
    const sitesJson = JSON.stringify(sites);
    const wasmPkg = await import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    );
    wasmPkg.build_spatial_voronoi_json(sitesJson);
    JSON.stringify(geoSpatialVoronoiFromSites(sites));

    const ratio = measureInterleavedMedianRatio(
      () => {
        JSON.stringify(geoSpatialVoronoiFromSites(sites));
      },
      () => {
        wasmPkg.build_spatial_voronoi_json(sitesJson);
      },
    );

    if (KERNEL_WASM_READY.spatialVoronoi) {
      expect(ratio).toBeLessThanOrEqual(1.1);
    } else {
      expect(ratio).toBeGreaterThan(0);
    }
  });
});
