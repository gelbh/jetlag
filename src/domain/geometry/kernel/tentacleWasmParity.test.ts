import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { assertPolygonTopologyParity } from "./parity";
import { wasmBuildSpatialVoronoiFromSites } from "./voronoiWasm";
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
  west: -0.199,
  east: -0.101,
  south: 51.401,
  north: 51.499,
};

const westSite = { id: "west", lat: 51.45, lng: -0.18 };
const eastSite = { id: "east", lat: 51.45, lng: -0.12 };
const anchor: LatLngTuple = [51.45, -0.15];
const oneMileMeters = 1609.344;

describe.skipIf(!wasmPkgReady)("tentacle wasm parity", () => {
  let wasmBuildTentacleEliminationRegion: typeof import("./tentacleWasm").wasmBuildTentacleEliminationRegion;
  let wasmBuildTentaclePoiAnswerEliminationRegion: typeof import("./tentacleWasm").wasmBuildTentaclePoiAnswerEliminationRegion;

  beforeAll(async () => {
    const wasm = await import("./tentacleWasm");
    wasmBuildTentacleEliminationRegion = wasm.wasmBuildTentacleEliminationRegion;
    wasmBuildTentaclePoiAnswerEliminationRegion =
      wasm.wasmBuildTentaclePoiAnswerEliminationRegion;
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    await wasmBuildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
  }, 60_000);

  it("matches TS topology on two-site tentacle elimination", async () => {
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const ts = loadPolygonGolden("tentacle", "two-site-elim.json");
    const wasm = await wasmBuildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);

    expect(wasm).not.toBeNull();
    const westOfBisector = turfPoint([-0.165, 51.45]);
    const eastOfBisector = turfPoint([-0.135, 51.45]);
    expect(booleanPointInPolygon(westOfBisector, wasm!)).toBe(true);
    expect(booleanPointInPolygon(eastOfBisector, wasm!)).toBe(false);
  });

  it("matches TS topology on POI-answer tentacle elimination", async () => {
    const sites = [westSite, eastSite];
    const cells = await wasmBuildSpatialVoronoiFromSites(
      sites.map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const ts = loadPolygonGolden("tentacle", "poi-answer-elim.json");
    const wasm = await wasmBuildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      sites,
      "east",
      gameArea,
      cells,
    );
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });
});

describe("tentacle wasm failure", () => {
  it("wasm init failure rethrows when entrypoint is ready", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", async () => {
      const actual = await vi.importActual<typeof import("./kernelWasmReady")>(
        "./kernelWasmReady",
      );
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          tentacleEliminationRegion: true,
        },
        shouldUseWasm: (mode: string, entrypoint: string) => {
          if (entrypoint === "tentacleEliminationRegion") {
            return mode === "wasm";
          }
          return actual.shouldUseWasm(
            mode as "wasm",
            entrypoint as import("./kernelWasmReady").KernelEntrypoint,
          );
        },
      };
    });
    vi.doMock("./tentacleWasm", () => ({
      wasmBuildTentacleEliminationRegion: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      wasmBuildTentaclePoiAnswerEliminationRegion: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      resetTentacleWasmForTests: vi.fn(),
    }));

    const { runTentacleEliminationRegion: runWithMock } = await import(
      "./tentacleKernelRunner"
    );
    const cells = await wasmBuildSpatialVoronoiFromSites(
      [westSite, eastSite].map((s) => ({
        lng: s.lng,
        lat: s.lat,
        properties: { poiId: s.id },
      })),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      runWithMock(
        {
          anchor,
          radiusMeters: oneMileMeters,
          sites: [westSite, eastSite],
          answeredSiteId: "east",
          gameArea,
          voronoiCells: cells,
        },
        "wasm",
      ),
    ).rejects.toThrow("wasm init failed");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./tentacleWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });
});
