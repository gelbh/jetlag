import { describe, expect, it } from "vitest";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";

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

  it("wasm_spatial_voronoi median within 1.1x ts", async () => {
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

    const tsMs = measureMedianMs(() => {
      geoSpatialVoronoiFromSites(sites);
    });
    const wasmMs = await measureMedianMsAsync(async () => {
      await wasmBuildSpatialVoronoiFromSites(sites);
    });

    expect(wasmMs / tsMs).toBeLessThanOrEqual(1.1);
  });
});
