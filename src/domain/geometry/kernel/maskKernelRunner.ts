import {
  buildEndGameMaskFromDisks as buildEndGameMaskFromDisksTs,
  buildMaskFromUnionInput as buildMaskFromUnionInputTs,
} from "./buildMask";
import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

const maskWasm = createLazyWasmImport(() => import("./maskWasm"));

export async function runMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "maskFromUnionInput",
    label: "buildMaskFromUnionInput",
    runTs: () => buildMaskFromUnionInputTs(input, gameArea),
    runWasm: async () => {
      const wasm = await maskWasm.load();
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
  return dispatchKernel({
    mode,
    entrypoint: "endGameMaskFromDisks",
    label: "buildEndGameMaskFromDisks",
    runTs: () => buildEndGameMaskFromDisksTs(gameArea, disks),
    runWasm: async () => {
      const wasm = await maskWasm.load();
      return wasm.wasmBuildEndGameMaskFromDisks(gameArea, disks);
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea)),
  });
}
