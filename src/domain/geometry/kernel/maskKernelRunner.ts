import {
  buildEndGameMaskFromDisks as buildEndGameMaskFromDisksTs,
  buildMaskFromUnionInput as buildMaskFromUnionInputTs,
} from "./buildMask";
import type { MaskKernelMode } from "./maskKernelMode";
import {
  wasmBuildEndGameMaskFromDisks,
  wasmBuildMaskFromUnionInput,
} from "./maskWasm";
import { bboxFromGameArea, maskTopologyMatches } from "./parity";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

function assertNever(value: never): never {
  throw new Error(`Unexpected mask kernel mode: ${String(value)}`);
}

async function runWithMaskKernel(
  mode: MaskKernelMode,
  label: string,
  gameArea: GameAreaGeometry,
  runTs: () => PolygonFeature | null,
  runWasm: () => Promise<PolygonFeature | null>,
): Promise<PolygonFeature | null> {
  switch (mode) {
    case "ts":
      return runTs();
    case "wasm":
      try {
        return await runWasm();
      } catch (error) {
        console.warn(`[geometry] mask kernel wasm failed (${label})`, error);
        return runTs();
      }
    case "dual": {
      const tsResult = runTs();
      try {
        const wasmResult = await runWasm();
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
    () => wasmBuildMaskFromUnionInput(input, gameArea),
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
    () => wasmBuildEndGameMaskFromDisks(gameArea, disks),
  );
}
