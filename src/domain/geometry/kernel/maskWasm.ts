import {
  loadKernelWasm,
  parseWasmFeature,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

/** Reset lazy WASM module (tests). */
export const resetMaskWasmForTests = resetKernelWasmForTests;

export async function wasmBuildMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_mask_from_union_input_json(
    JSON.stringify(input),
    JSON.stringify(gameArea),
  );
  return parseWasmFeature(result);
}

export async function wasmBuildEndGameMaskFromDisks(
  gameArea: GameAreaGeometry,
  disks: readonly DiskSpec[],
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_end_game_mask_from_disks_json(
    JSON.stringify(gameArea),
    JSON.stringify(disks),
  );
  return parseWasmFeature(result);
}
