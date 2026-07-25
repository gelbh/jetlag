import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Feature, LineString } from "geojson";
import { assertPolygonTopologyParity } from "./parity";
import { geodesicLineBuffer } from "./geodesicLineBuffer";

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

  it("matches TS topology on short line + 200m buffer", async () => {
    const ts = geodesicLineBuffer(shortLine, 200);
    const wasm = await wasmGeodesicLineBuffer(shortLine, 200);
    assertPolygonTopologyParity(wasm, ts, topologyBbox);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid sampleSpacingMeters (%s) with RangeError",
    async (spacing) => {
      expect(() => geodesicLineBuffer(shortLine, 200, spacing)).toThrow(
        RangeError,
      );
      await expect(
        wasmGeodesicLineBuffer(shortLine, 200, spacing),
      ).rejects.toThrow(RangeError);
    },
  );
});

describe("geodesic wasm fallback", () => {
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
          geodesicLineBuffer: true,
        },
        shouldUseWasm: (mode: string, entrypoint: string) => {
          if (entrypoint === "geodesicLineBuffer") {
            return mode === "wasm" || mode === "dual";
          }
          return actual.shouldUseWasm(
            mode as "ts" | "dual" | "wasm",
            entrypoint as import("./kernelWasmReady").KernelEntrypoint,
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
    const { geodesicLineBuffer: buildTs } = await import("./geodesicLineBuffer");

    const expected = buildTs(shortLine, 200);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runWithMock(shortLine, 200, undefined, "wasm");
    expect(result).toEqual(expected);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    vi.doUnmock("./geodesicWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });
});
