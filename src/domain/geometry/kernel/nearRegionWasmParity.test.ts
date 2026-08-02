import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Feature, LineString } from "geojson";
import { assertPolygonTopologyParity } from "./parity";
import { buildCoastlineNearRegionTs } from "../measuring/nearRegions";
import type { GameArea } from "../../map/annotations";
import { featureToGameAreaGeometry } from "./featureConvert";
import { gameAreaToFeature } from "../gameArea/geometryCore";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

const sampleGameArea: GameArea = {
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

describe.skipIf(!wasmPkgReady)("near-region batch wasm parity", () => {
  let wasmBuildNearRegion: typeof import("./nearRegionWasm").wasmBuildNearRegion;

  beforeAll(async () => {
    const wasm = await import("./nearRegionWasm");
    wasmBuildNearRegion = wasm.wasmBuildNearRegion;
    await wasmBuildNearRegion({
      segments: [segment],
      distanceMeters: 200,
      disks: [],
      gameArea: featureToGameAreaGeometry(gameAreaToFeature(sampleGameArea)),
    });
  }, 60_000);

  it("matches TS coastline topology on short segment + 200m", async () => {
    const ts = buildCoastlineNearRegionTs([segment], 200, sampleGameArea);
    const wasm = await wasmBuildNearRegion({
      segments: [segment],
      distanceMeters: 200,
      disks: [],
      gameArea: featureToGameAreaGeometry(gameAreaToFeature(sampleGameArea)),
    });
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS multi-place disks topology", async () => {
    const { buildMultiPlaceNearRegionTs } = await import("../measuring/nearRegions");
    const places = [
      [51.45, -0.15] as [number, number],
      [51.46, -0.14] as [number, number],
    ];
    const ts = buildMultiPlaceNearRegionTs(places, 400, sampleGameArea);
    const wasm = await wasmBuildNearRegion({
      segments: [],
      distanceMeters: 0,
      disks: places.map((center) => ({
        center,
        radiusMeters: 400,
      })),
      gameArea: featureToGameAreaGeometry(gameAreaToFeature(sampleGameArea)),
    });
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });
});

describe("near-region batch wasm fallback", () => {
  it("wasm init failure falls back to TS when entrypoint forced ready", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", async () => {
      const actual =
        await vi.importActual<typeof import("./kernelWasmReady")>(
          "./kernelWasmReady",
        );
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          nearRegionBatch: true,
        },
        shouldUseWasm: (mode: string, entrypoint: string) => {
          if (entrypoint === "nearRegionBatch") {
            return mode === "wasm" || mode === "dual";
          }
          return actual.shouldUseWasm(
            mode as "ts" | "wasm" | "dual",
            entrypoint as never,
          );
        },
      };
    });
    vi.doMock("./nearRegionWasm", () => ({
      wasmBuildNearRegion: async () => {
        throw new Error("wasm boom");
      },
    }));

    const { runNearRegionBatch } = await import("./nearRegionKernelRunner");
    const ts = buildCoastlineNearRegionTs([segment], 200, sampleGameArea);
    const result = await runNearRegionBatch(
      {
        segments: [segment],
        distanceMeters: 200,
        disks: [],
        gameArea: featureToGameAreaGeometry(gameAreaToFeature(sampleGameArea)),
        runTs: () => ts,
      },
      "wasm",
    );
    expect(result).toEqual(ts);

    vi.doUnmock("./kernelWasmReady");
    vi.doUnmock("./nearRegionWasm");
    vi.resetModules();
  });
});
