import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assertPolygonTopologyParity } from "./parity";
import { buildHalfPlanePolygon, buildRadarShadedRegion } from "./radarHalfPlane";
import type { GameAreaGeometry, LatLngTuple } from "./types";

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
  // Inset from game-area edges: turf vs geo disagree on exact boundary PIP.
  west: -0.199,
  east: -0.101,
  south: 51.401,
  north: 51.499,
};

/** Thermo A/B across London gameArea (plan fixture). */
const thermoA: LatLngTuple = [51.45, -0.18];
const thermoB: LatLngTuple = [51.46, -0.12];

describe.skipIf(!wasmPkgReady)("half-plane wasm parity", () => {
  let wasmBuildHalfPlanePolygon: typeof import("./halfPlaneWasm").wasmBuildHalfPlanePolygon;
  let wasmBuildRadarShadedRegion: typeof import("./halfPlaneWasm").wasmBuildRadarShadedRegion;

  beforeAll(async () => {
    const wasm = await import("./halfPlaneWasm");
    wasmBuildHalfPlanePolygon = wasm.wasmBuildHalfPlanePolygon;
    wasmBuildRadarShadedRegion = wasm.wasmBuildRadarShadedRegion;
    await wasmBuildHalfPlanePolygon(thermoA, thermoB, gameArea, "cold");
  }, 60_000);

  it("matches TS topology on cold half-plane (thermo fixture)", async () => {
    const ts = buildHalfPlanePolygon(thermoA, thermoB, gameArea, "cold");
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "cold",
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on hot half-plane", async () => {
    const ts = buildHalfPlanePolygon(thermoA, thermoB, gameArea, "hot");
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "hot",
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on radar outside shaded region", async () => {
    const center: LatLngTuple = [51.45, -0.15];
    const ts = buildRadarShadedRegion(center, 400, gameArea, false);
    const wasm = await wasmBuildRadarShadedRegion(center, 400, gameArea, false);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on cold half-plane with start divisionAnchor", async () => {
    const ts = buildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "cold",
      "start",
    );
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "cold",
      "start",
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it("matches TS topology on radar inside shaded region", async () => {
    const center: LatLngTuple = [51.45, -0.15];
    const ts = buildRadarShadedRegion(center, 400, gameArea, true);
    const wasm = await wasmBuildRadarShadedRegion(center, 400, gameArea, true);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });
});

describe("half-plane wasm fallback", () => {
  it("wasm init failure falls back to TS when ready (dispatch path)", async () => {
    // Registry keeps halfPlane not ready today; force ready via shouldUseWasm mock
    // would be Task 6. Fallback is covered by dispatchKernel + mask tests.
    // Here: when WASM throws after a future flip, runner falls back — exercise
    // by temporarily stubbing KERNEL_WASM_READY through shouldUseWasm.
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
          halfPlane: true,
        },
        shouldUseWasm: (mode: string, entrypoint: string) => {
          if (entrypoint === "halfPlane") {
            return mode === "wasm" || mode === "dual";
          }
          return actual.shouldUseWasm(
            mode as "ts" | "dual" | "wasm",
            entrypoint as import("./kernelWasmReady").KernelEntrypoint,
          );
        },
      };
    });
    vi.doMock("./halfPlaneWasm", () => ({
      wasmBuildHalfPlanePolygon: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      wasmBuildRadarShadedRegion: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      resetHalfPlaneWasmForTests: vi.fn(),
    }));

    const { dispatchHalfPlane: runWithMock } = await import(
      "./halfPlaneKernelRunner"
    );
    const { buildHalfPlanePolygon: buildTs } = await import("./radarHalfPlane");

    const expected = buildTs(thermoA, thermoB, gameArea, "cold");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runWithMock(
      thermoA,
      thermoB,
      gameArea,
      "cold",
      "midpoint",
      "wasm",
    );
    expect(result).toEqual(expected);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./halfPlaneWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });
});
