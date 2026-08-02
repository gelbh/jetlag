import { describe, expect, it, vi } from "vitest";
import { geoSpatialVoronoiFromSites } from "./spatialVoronoi";

describe("voronoiWasmParity", () => {
  it("wasm init failure falls back to TS when entrypoint is ready", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", async () => {
      const actual = await vi.importActual<typeof import("./kernelWasmReady")>(
        "./kernelWasmReady",
      );
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          spatialVoronoi: true,
        },
        shouldUseWasm: (mode: string, entrypoint: string) => {
          if (entrypoint === "spatialVoronoi") {
            return mode === "wasm" || mode === "dual";
          }
          return actual.shouldUseWasm(
            mode as "ts" | "dual" | "wasm",
            entrypoint as import("./kernelWasmReady").KernelEntrypoint,
          );
        },
      };
    });
    vi.doMock("./voronoiWasm", () => ({
      wasmBuildSpatialVoronoiFromSites: vi.fn(async () => {
        throw new Error("wasm init failed");
      }),
      resetVoronoiWasmForTests: vi.fn(),
    }));

    const { runSpatialVoronoi: runWithMock } = await import("./voronoiKernelRunner");

    const sites = [
      { lng: -0.18, lat: 51.45, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
    ];
    const expected = geoSpatialVoronoiFromSites(sites);
    const result = await runWithMock(sites, "wasm");
    expect(result).toEqual(expected);

    vi.doUnmock("./voronoiWasm");
    vi.doUnmock("./kernelWasmReady");
    vi.resetModules();
  });

  it("wasm path returns FeatureCollection with site properties", async () => {
    const { wasmBuildSpatialVoronoiFromSites } = await import("./voronoiWasm");
    const sites = [
      { lng: -0.18, lat: 51.44, properties: { poiId: "west" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "east" } },
      { lng: -0.15, lat: 51.48, properties: { poiId: "north" } },
    ];
    const result = await wasmBuildSpatialVoronoiFromSites(sites);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(3);
    expect(result.features[0]?.properties?.poiId).toBe("west");
  });

  it("wasm path keeps near-duplicate coords that TS string keys treat as distinct", async () => {
    const { wasmBuildSpatialVoronoiFromSites } = await import("./voronoiWasm");
    const sites = [
      { lng: -0.18, lat: 51.44, properties: { poiId: "a" } },
      { lng: -0.18, lat: 51.44 + 4e-10, properties: { poiId: "near" } },
      { lng: -0.12, lat: 51.45, properties: { poiId: "b" } },
    ];
    const result = await wasmBuildSpatialVoronoiFromSites(sites);
    expect(result.features).toHaveLength(3);
    expect(result.features.map((f) => f.properties?.poiId)).toEqual([
      "a",
      "near",
      "b",
    ]);
  });
});
