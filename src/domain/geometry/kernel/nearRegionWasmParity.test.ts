import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Feature, LineString } from "geojson";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildCoastlineNearRegionDistanceThreshold } from "../measuring/coastlineNearRegion";
import { prepareMeasuringLineSegments } from "../measuring/nearRegions";
import { loadPolygonGolden } from "./loadPolygonGolden";
import { assertPolygonTopologyParity } from "./parity";
import type { GameAreaGeometry } from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

const sampleGameArea: GameAreaGeometry = {
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

const segment: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-0.15, 51.45],
      [-0.14, 51.451],
    ],
  },
};

const topologyBbox = {
  west: -0.2,
  east: -0.1,
  south: 51.4,
  north: 51.5,
};

/** Default cell divisions miss a 200 m band on this small fixture; keep parity explicit. */
const coastlineParityDivisions = 32;

describe.skipIf(!wasmPkgReady)("near-region batch wasm parity", () => {
  let wasmBuildNearRegion: typeof import("./nearRegionWasm").wasmBuildNearRegion;

  beforeAll(async () => {
    const wasm = await import("./nearRegionWasm");
    wasmBuildNearRegion = wasm.wasmBuildNearRegion;
    const prepared = prepareMeasuringLineSegments([segment], sampleGameArea as GameArea);
    await wasmBuildNearRegion({
      segments: prepared.segments,
      distanceMeters: 200,
      disks: [],
      gameArea: sampleGameArea,
      mode: "distanceThreshold",
      divisions: coastlineParityDivisions,
    });
  }, 60_000);

  it("matches golden coastline topology on short segment + 200m", async () => {
    const golden = loadPolygonGolden("nearRegion", "coastline-200m.json");
    const prepared = prepareMeasuringLineSegments([segment], sampleGameArea as GameArea);
    const wasm = await wasmBuildNearRegion({
      segments: prepared.segments,
      distanceMeters: 200,
      disks: [],
      gameArea: sampleGameArea,
      mode: "distanceThreshold",
      divisions: coastlineParityDivisions,
    });
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("wasm distance-threshold matches TypeScript on short segment + 200m", async () => {
    const prepared = prepareMeasuringLineSegments([segment], sampleGameArea as GameArea);
    const ts = await buildCoastlineNearRegionDistanceThreshold(
      prepared.segments,
      200,
      sampleGameArea as GameArea,
      { divisions: coastlineParityDivisions },
    );
    const wasm = await wasmBuildNearRegion({
      segments: prepared.segments,
      distanceMeters: 200,
      disks: [],
      gameArea: sampleGameArea,
      mode: "distanceThreshold",
      divisions: coastlineParityDivisions,
    });
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches golden multi-place disks topology", async () => {
    const places = [[51.45, -0.15] as [number, number], [51.46, -0.14] as [number, number]];
    const golden = loadPolygonGolden("nearRegion", "multi-place-400m.json");
    const wasm = await wasmBuildNearRegion({
      segments: [],
      distanceMeters: 0,
      disks: places.map((center) => ({
        center,
        radiusMeters: 400,
      })),
      gameArea: sampleGameArea,
    });
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });
});

describe("near-region batch wasm failure", () => {
  it("wasm init failure rethrows when entrypoint forced ready", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", async () => {
      const actual = await vi.importActual<typeof import("./kernelWasmReady")>("./kernelWasmReady");
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          nearRegionBatch: true,
        },
        shouldUseWasm: (entrypoint: string) => {
          if (entrypoint === "nearRegionBatch") {
            return true;
          }
          return actual.shouldUseWasm(entrypoint as never);
        },
      };
    });
    vi.doMock("./nearRegionWasm", () => ({
      wasmBuildNearRegion: async () => {
        throw new Error("wasm boom");
      },
    }));

    const { runNearRegionBatch } = await import("./nearRegionKernelRunner");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      runNearRegionBatch({
        segments: [segment],
        distanceMeters: 200,
        disks: [],
        gameArea: sampleGameArea,
      }),
    ).rejects.toThrow("wasm boom");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./kernelWasmReady");
    vi.doUnmock("./nearRegionWasm");
    vi.resetModules();
  });
});
