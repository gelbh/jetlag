import type { FeatureCollection } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
import {
  geoSpatialVoronoiFromSites,
  type SpatialVoronoiSite,
} from "./spatialVoronoi";

type VoronoiWasmApi = typeof import("./voronoiWasm");

let voronoiWasmModulePromise: Promise<VoronoiWasmApi> | null = null;

function loadVoronoiWasmModule(): Promise<VoronoiWasmApi> {
  if (!voronoiWasmModulePromise) {
    voronoiWasmModulePromise = import("./voronoiWasm").catch((error) => {
      voronoiWasmModulePromise = null;
      throw error;
    });
  }
  return voronoiWasmModulePromise;
}

/** Production spatial Voronoi entrypoint (mode + KERNEL_WASM_READY). */
export async function runSpatialVoronoi<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  sites: Array<SpatialVoronoiSite<T>>,
  mode: MaskKernelMode = "wasm",
): Promise<FeatureCollection> {
  return dispatchSpatialVoronoi(sites, mode);
}

/** Mode + KERNEL_WASM_READY dispatch for spatial Voronoi. */
export async function dispatchSpatialVoronoi<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  sites: Array<SpatialVoronoiSite<T>>,
  mode: MaskKernelMode = "wasm",
): Promise<FeatureCollection> {
  return dispatchKernel({
    mode,
    entrypoint: "spatialVoronoi",
    label: "spatialVoronoi",
    runTs: () => geoSpatialVoronoiFromSites(sites),
    runWasm: async () => {
      const wasm = await loadVoronoiWasmModule();
      return wasm.wasmBuildSpatialVoronoiFromSites(sites);
    },
  });
}
