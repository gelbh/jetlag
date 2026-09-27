import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

const maskWasm = createLazyWasmImport(() => import("./maskWasm"));

export async function runMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    entrypoint: "maskFromUnionInput",
    label: "buildMaskFromUnionInput",
    runWasm: async () => {
      const wasm = await maskWasm.load();
      return wasm.wasmBuildMaskFromUnionInput(input, gameArea);
    },
  });
}

export async function runEndGameMaskFromDisks(
  gameArea: GameAreaGeometry,
  disks: readonly DiskSpec[]
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    entrypoint: "endGameMaskFromDisks",
    label: "buildEndGameMaskFromDisks",
    runWasm: async () => {
      const wasm = await maskWasm.load();
      return wasm.wasmBuildEndGameMaskFromDisks(gameArea, disks);
    },
  });
}
