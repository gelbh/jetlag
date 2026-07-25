import {
  buildEndGameMaskFromDisks as buildEndGameMaskFromDisksTs,
  buildMaskFromUnionInput as buildMaskFromUnionInputTs,
} from "./buildMask";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

type MaskWasmApi = typeof import("./maskWasm");

let maskWasmModulePromise: Promise<MaskWasmApi> | null = null;

function loadMaskWasmModule(): Promise<MaskWasmApi> {
  if (!maskWasmModulePromise) {
    maskWasmModulePromise = import(/* @vite-ignore */ "./maskWasm");
  }
  return maskWasmModulePromise;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected mask kernel mode: ${String(value)}`);
}

async function runWithMaskKernel(
  mode: MaskKernelMode,
  label: string,
  gameArea: GameAreaGeometry,
  runTs: () => PolygonFeature | null,
  runWasm: (wasm: MaskWasmApi) => Promise<PolygonFeature | null>,
): Promise<PolygonFeature | null> {
  switch (mode) {
    case "ts":
      return runTs();
    case "wasm":
      try {
        const wasm = await loadMaskWasmModule();
        return await runWasm(wasm);
      } catch (error) {
        console.warn(`[geometry] mask kernel wasm failed (${label})`, error);
        return runTs();
      }
    case "dual": {
      const tsResult = runTs();
      try {
        const wasm = await loadMaskWasmModule();
        const wasmResult = await runWasm(wasm);
        if (
          !maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea))
        ) {
          console.warn(`[geometry] mask kernel dual mismatch (${label})`);
        }
      } catch (error) {
        console.warn(
          `[geometry] mask kernel dual wasm failed (${label})`,
          error,
        );
      }
      return tsResult;
    }
    default:
      return assertNever(mode);
  }
}

export async function runMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  return runWithMaskKernel(
    mode,
    "buildMaskFromUnionInput",
    gameArea,
    () => buildMaskFromUnionInputTs(input, gameArea),
    (wasm) => wasm.wasmBuildMaskFromUnionInput(input, gameArea),
  );
}

export async function runEndGameMaskFromDisks(
  gameArea: GameAreaGeometry,
  disks: readonly DiskSpec[],
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  return runWithMaskKernel(
    mode,
    "buildEndGameMaskFromDisks",
    gameArea,
    () => buildEndGameMaskFromDisksTs(gameArea, disks),
    (wasm) => wasm.wasmBuildEndGameMaskFromDisks(gameArea, disks),
  );
}
