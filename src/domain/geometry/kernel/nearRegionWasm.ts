import { loadKernelWasm, parseWasmFeature, resetKernelWasmForTests } from "./kernelWasmPkg";
import type { NearRegionBatchInput, PolygonFeature } from "./types";

export type { NearRegionBatchInput } from "./types";

/** Reset lazy WASM module (tests). */
export const resetNearRegionWasmForTests = resetKernelWasmForTests;

export async function wasmBuildNearRegion(
  input: NearRegionBatchInput,
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const payload = {
    segments: input.segments.map((segment) => segment.geometry.coordinates),
    distanceMeters: input.distanceMeters,
    disks: input.disks,
    gameArea: input.gameArea,
  };
  const result = wasm.build_near_region_json(JSON.stringify(payload));
  return parseWasmFeature(result);
}
