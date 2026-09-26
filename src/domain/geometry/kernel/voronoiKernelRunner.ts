import type { FeatureCollection } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import {
  geoSpatialVoronoiFromSites,
  type SpatialVoronoiSite,
} from "./spatialVoronoi";

const voronoiWasm = createLazyWasmImport(() => import("./voronoiWasm"));

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
      const wasm = await voronoiWasm.load();
      return wasm.wasmBuildSpatialVoronoiFromSites(sites);
    },
  });
}

/** Public alias; callers may import either name. */
export const runSpatialVoronoi = dispatchSpatialVoronoi;
