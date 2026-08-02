import type { Feature, LineString } from "geojson";
import {
  loadKernelWasm,
  parseWasmFeature,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";

/** Reset lazy WASM module (tests). */
export const resetNearRegionWasmForTests = resetKernelWasmForTests;

export type NearRegionBatchInput = {
  segments: readonly Feature<LineString>[];
  distanceMeters: number;
  disks: readonly DiskSpec[];
  gameArea: GameAreaGeometry;
};

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
