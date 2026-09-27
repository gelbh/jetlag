import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runEndGameMaskFromDisks } from "./maskKernelRunner";
import { loadPolygonGolden } from "./loadPolygonGolden";
import { assertPolygonTopologyParity } from "./parity";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
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

describe.skipIf(!wasmPkgReady)("mask wasm parity", () => {
  let wasmBuildMaskFromUnionInput: typeof import("./maskWasm").wasmBuildMaskFromUnionInput;
  let wasmBuildEndGameMaskFromDisks: typeof import("./maskWasm").wasmBuildEndGameMaskFromDisks;

  beforeAll(async () => {
    const wasm = await import("./maskWasm");
    wasmBuildMaskFromUnionInput = wasm.wasmBuildMaskFromUnionInput;
    wasmBuildEndGameMaskFromDisks = wasm.wasmBuildEndGameMaskFromDisks;
    await wasmBuildMaskFromUnionInput({ polygons: [], disks: [] }, gameArea);
  }, 60_000);

  it("matches golden topology on overlapping square union (no disks)", async () => {
    const input = {
      polygons: [square(-0.19), square(-0.17), square(-0.15)],
      disks: [],
    };
    const golden = loadPolygonGolden("mask", "overlapping-squares.json");
    const wasm = await wasmBuildMaskFromUnionInput(input, gameArea);
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("raw wasm matches golden on a single end-game disk", async () => {
    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    const golden = loadPolygonGolden("mask", "single-endgame-disk.json");
    const wasm = await wasmBuildEndGameMaskFromDisks(gameArea, disks);
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("wasm mode matches golden topology for multi-disk end-game", async () => {
    const disks = overlappingEndGameDisks();
    const golden = loadPolygonGolden("mask", "multi-endgame-disks.json");
    const result = await runEndGameMaskFromDisks(gameArea, disks, "wasm");
    assertPolygonTopologyParity(result, golden, topologyBbox);
  });
});

describe("mask wasm failure", () => {
  it("wasm init failure rethrows (no silent TS fail-soft)", async () => {
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

    const input = { polygons: [square(-0.18)], disks: [] };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(runWithMock(input, gameArea, "wasm")).rejects.toThrow(
      "wasm init failed",
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./maskWasm");
    vi.resetModules();
  });

  it("wasm mode with disks uses wasm path when pkg is ready", async () => {
    vi.resetModules();
    const golden = loadPolygonGolden("mask", "single-endgame-disk.json");
    const wasmBuildEndGame = vi.fn(async () => golden);
    vi.doMock("./maskWasm", () => ({
      wasmBuildMaskFromUnionInput: vi.fn(),
      wasmBuildEndGameMaskFromDisks: wasmBuildEndGame,
      resetMaskWasmForTests: vi.fn(),
    }));

    const { runEndGameMaskFromDisks: runWithMock } = await import(
      "./maskKernelRunner"
    );

    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    await runWithMock(gameArea, disks, "wasm");
    expect(wasmBuildEndGame).toHaveBeenCalled();

    vi.doUnmock("./maskWasm");
    vi.resetModules();
  });
});
