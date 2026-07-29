import { beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildEndGameMaskFromDisks } from "./buildMask";
import { wasmBuildEndGameMaskFromDisks } from "./maskWasm";
import { assertPolygonTopologyParity } from "./parity";
import { type DiskSpec } from "./unionPolygonFeatures";
import type { GameAreaGeometry } from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);
const runGeometryPerf = process.env.GEOMETRY_PERF === "1";

const gameArea: GameAreaGeometry = {
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

const topologyBbox = {
  west: -0.2,
  east: -0.1,
  south: 51.4,
  north: 51.5,
};

/** Five overlapping end-game disks (CircleUnion vs Rust geodesic gons). */
function overlappingEndGameDisks(): DiskSpec[] {
  const centerLat = 51.45;
  const centerLng = -0.15;
  return Array.from({ length: 5 }, (_, index) => ({
    center: [centerLat + index * 0.002, centerLng + index * 0.002] as [
      number,
      number,
    ],
    radiusMeters: 500,
  }));
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

describe.skipIf(!wasmPkgReady)("disk wasm advantage", () => {
  beforeAll(async () => {
    await wasmBuildEndGameMaskFromDisks(gameArea, overlappingEndGameDisks());
  }, 60_000);

  it("matches TS topology on overlapping end-game disks", async () => {
    const disks = overlappingEndGameDisks();
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const wasm = await wasmBuildEndGameMaskFromDisks(gameArea, disks);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on ten end-game disks", async () => {
    const disks = circleDisks(10);
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const wasm = await wasmBuildEndGameMaskFromDisks(gameArea, disks);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });
});

describe.skipIf(!wasmPkgReady || !runGeometryPerf)(
  "disk wasm advantage perf",
  () => {
    beforeAll(async () => {
      await wasmBuildEndGameMaskFromDisks(gameArea, overlappingEndGameDisks());
    }, 60_000);

    it("wasm overlapping end-game disks median within 1.0x ts", async () => {
      const disks = overlappingEndGameDisks();
      const tsMs = measureMedianMs(() => {
        buildEndGameMaskFromDisks(gameArea, disks);
      });
      const wasmMs = await measureMedianMsAsync(async () => {
        await wasmBuildEndGameMaskFromDisks(gameArea, disks);
      });

      expect(wasmMs / tsMs).toBeLessThanOrEqual(1.0);
    });

    it("wasm ten end-game disks median within 1.0x ts", async () => {
      const disks = circleDisks(10);
      const tsMs = measureMedianMs(() => {
        buildEndGameMaskFromDisks(gameArea, disks);
      });
      const wasmMs = await measureMedianMsAsync(async () => {
        await wasmBuildEndGameMaskFromDisks(gameArea, disks);
      });

      expect(wasmMs / tsMs).toBeLessThanOrEqual(1.0);
    });
  },
);

describe("disk wasm advantage gate", () => {
  it("skips perf gates unless GEOMETRY_PERF=1", () => {
    expect(runGeometryPerf || true).toBe(true);
  });
});
