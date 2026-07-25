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
    // Lazy chunk: default ts mode never executes this; Vite still emits an async
    // chunk, with optionalMaskWasmPkg stubbing when gitignored pkg/ is missing.
    maskWasmModulePromise = import("./maskWasm").catch((error) => {
      maskWasmModulePromise = null;
      throw error;
    });
  }
  return maskWasmModulePromise;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected mask kernel mode: ${String(value)}`);
}

/**
 * Disk CircleUnion (turf) is intentionally not a WASM parity goal.
 * Skip wasm/dual compare when any disk is present.
 */
function skipWasmForDisks(mode: MaskKernelMode, diskCount: number): boolean {
  return mode !== "ts" && diskCount > 0;
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
  if (skipWasmForDisks(mode, input.disks.length)) {
    if (mode === "wasm") {
      console.warn(
        "[geometry] mask kernel wasm skipped (disks present; CircleUnion non-goal)",
      );
    }
    return buildMaskFromUnionInputTs(input, gameArea);
  }
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
  if (skipWasmForDisks(mode, disks.length)) {
    if (mode === "wasm") {
      console.warn(
        "[geometry] mask kernel wasm skipped (disks present; CircleUnion non-goal)",
      );
    }
    return buildEndGameMaskFromDisksTs(gameArea, disks);
  }
  return runWithMaskKernel(
    mode,
    "buildEndGameMaskFromDisks",
    gameArea,
    () => buildEndGameMaskFromDisksTs(gameArea, disks),
    (wasm) => wasm.wasmBuildEndGameMaskFromDisks(gameArea, disks),
  );
}
