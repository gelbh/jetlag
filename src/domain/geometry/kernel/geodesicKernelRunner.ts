import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import type { PolygonFeature } from "./types";

type GeodesicWasmApi = typeof import("./geodesicWasm");

let geodesicWasmModulePromise: Promise<GeodesicWasmApi> | null = null;

function loadGeodesicWasmModule(): Promise<GeodesicWasmApi> {
  if (!geodesicWasmModulePromise) {
    geodesicWasmModulePromise = import("./geodesicWasm").catch((error) => {
      geodesicWasmModulePromise = null;
      throw error;
    });
  }
  return geodesicWasmModulePromise;
}

function topologyBboxFromResults(
  wasmResult: PolygonFeature | null,
  tsResult: PolygonFeature | null,
): { west: number; east: number; south: number; north: number } {
  const feature = tsResult ?? wasmResult;
  if (!feature) {
    return { west: 0, east: 0, south: 0, north: 0 };
  }
  return bboxFromGameArea(feature.geometry);
}

/** Production geodesic buffer entrypoint (mode + KERNEL_WASM_READY). */
export async function runGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  return dispatchGeodesicLineBuffer(
    segment,
    distanceMeters,
    sampleSpacingMeters,
    mode,
  );
}

/** Mode + KERNEL_WASM_READY dispatch for geodesic line buffer. */
export async function dispatchGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "geodesicLineBuffer",
    label: "geodesicLineBuffer",
    runTs: () =>
      geodesicLineBuffer(segment, distanceMeters, sampleSpacingMeters),
    runWasm: async () => {
      const wasm = await loadGeodesicWasmModule();
      return wasm.wasmGeodesicLineBuffer(
        segment,
        distanceMeters,
        sampleSpacingMeters,
      );
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(
        wasmResult,
        tsResult,
        topologyBboxFromResults(wasmResult, tsResult),
      ),
  });
}
