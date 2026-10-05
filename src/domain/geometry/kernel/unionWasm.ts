import { loadKernelWasm, parseWasmFeature } from "./kernelWasmPkg";
import type { PolygonFeature } from "./types";

export async function wasmUnionPolygonFeatures(
  features: readonly PolygonFeature[],
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.union_polygon_features_json(JSON.stringify(features));
  return parseWasmFeature(result);
}
