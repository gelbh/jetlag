import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assertPolygonTopologyParity } from "./parity";
import { loadPolygonGolden } from "./loadPolygonGolden";
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

  it("matches golden topology on cold half-plane (thermo fixture)", async () => {
    const golden = loadPolygonGolden("halfPlane", "cold.json");
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "cold",
    );
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("matches golden topology on hot half-plane", async () => {
    const golden = loadPolygonGolden("halfPlane", "hot.json");
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "hot",
    );
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("matches golden topology on radar outside shaded region", async () => {
    const center: LatLngTuple = [51.45, -0.15];
    const golden = loadPolygonGolden("halfPlane", "radar-outside.json");
    const wasm = await wasmBuildRadarShadedRegion(center, 400, gameArea, false);
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("matches golden topology on cold half-plane with start divisionAnchor", async () => {
    const golden = loadPolygonGolden("halfPlane", "cold-start.json");
    const wasm = await wasmBuildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      "cold",
      "start",
    );
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it("matches golden topology on radar inside shaded region", async () => {
    const center: LatLngTuple = [51.45, -0.15];
    const golden = loadPolygonGolden("halfPlane", "radar-inside.json");
    const wasm = await wasmBuildRadarShadedRegion(center, 400, gameArea, true);
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });
});

describe("half-plane wasm failure", () => {
  it("wasm init failure rethrows when ready (dispatch path)", async () => {
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
        shouldUseWasm: (entrypoint: string) => {
          if (entrypoint === "halfPlane") {
            return true;
          }
          return actual.shouldUseWasm(entrypoint as import("./kernelWasmReady").KernelEntrypoint,
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

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      runWithMock(
        thermoA,
        thermoB,
        gameArea,
        "cold",
        "midpoint",
      ),
    ).rejects.toThrow("wasm init failed");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./halfPlaneWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });
});
