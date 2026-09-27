import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Feature, LineString } from "geojson";
import { assertPolygonTopologyParity } from "./parity";
import { loadPolygonGolden } from "./loadPolygonGolden";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

/** Short LineString + 200m buffer (plan fixture). */
const shortLine: Feature<LineString> = {
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
  west: -0.16,
  east: -0.13,
  south: 51.44,
  north: 51.46,
};

describe.skipIf(!wasmPkgReady)("geodesic wasm parity", () => {
  let wasmGeodesicLineBuffer: typeof import("./geodesicWasm").wasmGeodesicLineBuffer;

  beforeAll(async () => {
    const wasm = await import("./geodesicWasm");
    wasmGeodesicLineBuffer = wasm.wasmGeodesicLineBuffer;
    await wasmGeodesicLineBuffer(shortLine, 200);
  }, 60_000);

  it("matches golden topology on short line + 200m buffer", async () => {
    const golden = loadPolygonGolden("geodesic", "short-200m.json");
    const wasm = await wasmGeodesicLineBuffer(shortLine, 200);
    assertPolygonTopologyParity(wasm, golden, topologyBbox);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid sampleSpacingMeters (%s) with RangeError",
    async (spacing) => {
      await expect(
        wasmGeodesicLineBuffer(shortLine, 200, spacing),
      ).rejects.toThrow(RangeError);
    },
  );
});

describe("geodesic wasm failure", () => {
  it("wasm init failure rethrows when entrypoint forced ready", async () => {
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
          geodesicLineBuffer: true,
        },
        shouldUseWasm: (entrypoint: string) => {
          if (entrypoint === "geodesicLineBuffer") {
            return true;
          }
          return actual.shouldUseWasm(entrypoint as import("./kernelWasmReady").KernelEntrypoint,
          );
        },
      };
    });
    vi.doMock("./geodesicWasm", () => ({
      wasmGeodesicLineBuffer: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      resetGeodesicWasmForTests: vi.fn(),
    }));

    const { dispatchGeodesicLineBuffer: runWithMock } = await import(
      "./geodesicKernelRunner"
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      runWithMock(shortLine, 200, undefined),
    ).rejects.toThrow("wasm init failed");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./geodesicWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });
});
