import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import type { MaskKernelMode } from "./maskKernelMode";
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

/**
 * Mode + KERNEL_WASM_READY dispatch for geodesic line buffer.
 * With geodesicLineBuffer not ready, always returns TS even when mode is wasm.
 */
export async function dispatchGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
  mode: MaskKernelMode = "ts",
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
  });
}
