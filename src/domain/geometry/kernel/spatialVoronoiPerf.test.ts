import { describe, expect, it } from "vitest";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
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
    geoSpatialVoronoiFromSites(sites);

    const tsMs = measureMedianMs(() => {
      geoSpatialVoronoiFromSites(sites);
    });
    const wasmMs = measureMedianMs(() => {
      wasmPkg.build_spatial_voronoi_json(sitesJson);
    });

    const ratio = tsMs === 0 ? 0 : wasmMs / tsMs;
    // Ready stays false while this gate fails (~2× on local/CI today).
    if (KERNEL_WASM_READY.spatialVoronoi) {
      expect(ratio).toBeLessThanOrEqual(1.1);
    } else {
      expect(ratio).toBeGreaterThan(0);
    }
  });
});
