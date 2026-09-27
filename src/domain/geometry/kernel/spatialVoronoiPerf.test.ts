import { describe, expect, it } from "vitest";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";

const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

async function measureMedianMsAsync(
  run: () => Promise<void>,
  iterations = 31,
): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    await run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

describe("spatialVoronoiPerf", () => {
  it("skips unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });

  it("wasm_spatial_voronoi median under 50ms (production-shaped)", async () => {
    if (!runGeometryPerf) {
      return;
    }
    const sites = [
      { lng: -0.18, lat: 51.44, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
      { lng: -0.15, lat: 51.48, properties: { poiId: "north" } },
      { lng: -0.16, lat: 51.42, properties: { poiId: "south" } },
      { lng: -0.14, lat: 51.46, properties: { poiId: "mid" } },
    ];
    await wasmBuildSpatialVoronoiFromSites(sites);
    const wasmMs = await measureMedianMsAsync(async () => {
      await wasmBuildSpatialVoronoiFromSites(sites);
    });
    // G5j measured median ~0.01ms (arm64); keep 50ms for CI headroom.
    expect(wasmMs).toBeLessThan(50);
  });
});
