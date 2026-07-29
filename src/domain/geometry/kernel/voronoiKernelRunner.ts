import type { FeatureCollection } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
import {
  geoSpatialVoronoiFromSites,
  type SpatialVoronoiSite,
} from "./spatialVoronoi";

/** Production spatial Voronoi entrypoint (mode + KERNEL_WASM_READY). */
export async function runSpatialVoronoi<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  sites: Array<SpatialVoronoiSite<T>>,
  mode: MaskKernelMode = "wasm",
): Promise<FeatureCollection> {
  return dispatchSpatialVoronoi(sites, mode);
}

/** Mode + KERNEL_WASM_READY dispatch for spatial Voronoi (Wave-2; TS-only until Phase E). */
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
      throw new Error("[geometry] spatialVoronoi wasm not ready");
    },
  });
}
