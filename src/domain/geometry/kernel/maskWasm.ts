import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

type MaskWasmModule = {
  build_mask_from_union_input_json: (
    inputJson: string,
    gameAreaJson: string,
  ) => unknown;
  build_end_game_mask_from_disks_json: (
    gameAreaJson: string,
    disksJson: string,
  ) => unknown;
};

let wasmModulePromise: Promise<MaskWasmModule> | null = null;

function parseWasmFeature(result: unknown): PolygonFeature | null {
  if (result == null) {
    return null;
  }
  if (typeof result === "string") {
    if (result.length === 0) {
      return null;
    }
    return JSON.parse(result) as PolygonFeature;
  }
  if (typeof result === "object") {
    return result as PolygonFeature;
  }
  return null;
}

async function loadMaskWasm(): Promise<MaskWasmModule> {
  if (!wasmModulePromise) {
    // Relative path: pkg/ is gitignored; avoid file: dep so npm ci works before wasm:build.
    wasmModulePromise = import(
      "../../../../crates/jetlag-geometry-mask/pkg/jetlag_geometry_mask.js"
    ) as Promise<MaskWasmModule>;
  }
  return wasmModulePromise;
}

/** Reset lazy WASM module (tests). */
export function resetMaskWasmForTests(): void {
  wasmModulePromise = null;
}

export async function wasmBuildMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
): Promise<PolygonFeature | null> {
  const wasm = await loadMaskWasm();
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
  const wasm = await loadMaskWasm();
  const result = wasm.build_end_game_mask_from_disks_json(
    JSON.stringify(gameArea),
    JSON.stringify(disks),
  );
  return parseWasmFeature(result);
}
