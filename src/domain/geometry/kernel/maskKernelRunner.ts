import {
  buildEndGameMaskFromDisks as buildEndGameMaskFromDisksTs,
  buildMaskFromUnionInput as buildMaskFromUnionInputTs,
} from "./buildMask";
import { dispatchKernel } from "./dispatchKernel";
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
    // Lazy chunk: ts mode never executes this; Vite still emits an async chunk,
    // with optionalKernelWasmPkg stubbing when gitignored pkg/ is missing.
    maskWasmModulePromise = import("./maskWasm").catch((error) => {
      maskWasmModulePromise = null;
      throw error;
    });
  }
  return maskWasmModulePromise;
}

/**
 * Disk CircleUnion (turf) is intentionally not a WASM parity goal.
 * Skip wasm/dual compare when any disk is present.
 */
function skipWasmForDisks(mode: MaskKernelMode, diskCount: number): boolean {
  return mode !== "ts" && diskCount > 0;
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
  return dispatchKernel({
    mode,
    entrypoint: "maskFromUnionInput",
    label: "buildMaskFromUnionInput",
    runTs: () => buildMaskFromUnionInputTs(input, gameArea),
    runWasm: async () => {
      const wasm = await loadMaskWasmModule();
      return wasm.wasmBuildMaskFromUnionInput(input, gameArea);
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea)),
  });
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
  return dispatchKernel({
    mode,
    entrypoint: "endGameMaskFromDisks",
    label: "buildEndGameMaskFromDisks",
    runTs: () => buildEndGameMaskFromDisksTs(gameArea, disks),
    runWasm: async () => {
      const wasm = await loadMaskWasmModule();
      return wasm.wasmBuildEndGameMaskFromDisks(gameArea, disks);
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea)),
  });
}
