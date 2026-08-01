import type { FeatureCollection } from "geojson";
import {
  loadKernelWasm,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type { SpatialVoronoiSite } from "./spatialVoronoi";

/** Reset lazy WASM module (tests). */
export const resetVoronoiWasmForTests = resetKernelWasmForTests;

export async function wasmBuildSpatialVoronoiFromSites<
  T extends Record<string, unknown> = Record<string, unknown>,
>(sites: Array<SpatialVoronoiSite<T>>): Promise<FeatureCollection> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_spatial_voronoi_json(JSON.stringify(sites));
  if (typeof result !== "string") {
    throw new Error("Geometry kernel returned a non-string Voronoi payload");
  }
  const parsed: unknown = JSON.parse(result);
  if (
    parsed == null ||
    typeof parsed !== "object" ||
    (parsed as { type?: unknown }).type !== "FeatureCollection" ||
    !Array.isArray((parsed as { features?: unknown }).features)
  ) {
    throw new Error("Geometry kernel returned an invalid FeatureCollection");
  }
  return parsed as FeatureCollection;
}
