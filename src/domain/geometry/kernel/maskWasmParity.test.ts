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

  it("matches TS topology on square union (no disks)", async () => {
    const input = { polygons: [square(-0.18)], disks: [] };
    const ts = buildMaskFromUnionInput(input, gameArea);
    const wasm = await wasmBuildMaskFromUnionInput(input, gameArea);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("raw wasm matches TS on a single end-game disk", async () => {
    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const wasm = await wasmBuildEndGameMaskFromDisks(gameArea, disks);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("wasm mode falls back to TS for multi-disk end-game (CircleUnion non-goal)", async () => {
    const disks = overlappingEndGameDisks();
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runEndGameMaskFromDisks(gameArea, disks, "wasm");
    expect(result).toEqual(ts);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("disks present"),
    );
    warnSpy.mockRestore();
  });

  it("dual mode returns TS for multi-disk end-game", async () => {
    const disks = overlappingEndGameDisks();
    const ts = buildEndGameMaskFromDisks(gameArea, disks);
    const dual = await runEndGameMaskFromDisks(gameArea, disks, "dual");
    expect(dual).toEqual(ts);
  });

  it("dual mode returns TS for polygon-only union", async () => {
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

  it("wasm mode with any disks uses TS without loading wasm", async () => {
    vi.resetModules();
    const wasmBuild = vi.fn(async () => {
      throw new Error("should not call wasm for disks");
    });
    vi.doMock("./maskWasm", () => ({
      wasmBuildMaskFromUnionInput: wasmBuild,
      wasmBuildEndGameMaskFromDisks: wasmBuild,
      resetMaskWasmForTests: vi.fn(),
    }));

    const { runEndGameMaskFromDisks: runWithMock } = await import(
      "./maskKernelRunner"
    );
    const { buildEndGameMaskFromDisks: buildTs } = await import("./buildMask");

    const disks: DiskSpec[] = [
      { center: [51.45, -0.15], radiusMeters: 400 },
    ];
    const expected = buildTs(gameArea, disks);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runWithMock(gameArea, disks, "wasm");
    expect(result).toEqual(expected);
    expect(wasmBuild).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("disks present"),
    );
    warnSpy.mockRestore();

    vi.doUnmock("./maskWasm");
    vi.resetModules();
  });
});
