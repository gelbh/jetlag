import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./buildMask";
import {
  runEndGameMaskFromDisks,
  runMaskFromUnionInput,
} from "./maskKernelRunner";
import { wasmBuildMaskFromUnionInput } from "./maskWasm";
import { assertPolygonTopologyParity } from "./parity";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-mask/pkg/jetlag_geometry_mask.js",
);
const wasmPkgReady = existsSync(pkgEntry);

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

describe.skipIf(!wasmPkgReady)("mask wasm parity", () => {
  beforeAll(async () => {
    // Warm WASM init (wasm-pack module side effects).
    await wasmBuildMaskFromUnionInput(
      { polygons: [], disks: [] },
      gameArea,
    );
  }, 60_000);

  it("matches TS topology on square union", async () => {
    const input = { polygons: [square(-0.18)], disks: [] };
    const ts = buildMaskFromUnionInput(input, gameArea);
    const wasm = await wasmBuildMaskFromUnionInput(input, gameArea);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on end-game disks", async () => {
    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const wasm = await runEndGameMaskFromDisks(gameArea, disks, "wasm");
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("dual mode returns TS", async () => {
    const input = { polygons: [square(-0.18)], disks: [] };
    const ts = buildMaskFromUnionInput(input, gameArea);
    const dual = await runMaskFromUnionInput(input, gameArea, "dual");
    expect(dual).toEqual(ts);
  });
});

describe("mask wasm fallback", () => {
  it("wasm init failure falls back to TS", async () => {
    vi.resetModules();
    vi.doMock("./maskWasm", () => ({
      wasmBuildMaskFromUnionInput: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      wasmBuildEndGameMaskFromDisks: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      resetMaskWasmForTests: vi.fn(),
    }));

    const { runMaskFromUnionInput: runWithMock } = await import(
      "./maskKernelRunner"
    );
    const { buildMaskFromUnionInput: buildTs } = await import("./buildMask");

    const input = { polygons: [square(-0.18)], disks: [] };
    const expected = buildTs(input, gameArea);
    const result = await runWithMock(input, gameArea, "wasm");
    expect(result).toEqual(expected);

    vi.doUnmock("./maskWasm");
    vi.resetModules();
  });
});
