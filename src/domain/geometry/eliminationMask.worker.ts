import { expose } from "comlink";
import {
  buildEndGameMaskFromDisks as buildEndGameMaskFromDisksTs,
  buildMaskFromUnionInput as buildMaskFromUnionInputTs,
} from "./kernel/buildMask";
import type { MaskKernelMode } from "./kernel/maskKernelMode";
import {
  bboxFromGameArea,
  maskTopologyMatches,
} from "./kernel/maskTopologyCompare";
import {
  wasmBuildEndGameMaskFromDisks,
  wasmBuildMaskFromUnionInput,
} from "./kernel/maskWasm";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./kernel/types";

function assertNever(value: never): never {
  throw new Error(`Unexpected mask kernel mode: ${String(value)}`);
}

async function buildMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  switch (mode) {
    case "ts":
      return buildMaskFromUnionInputTs(input, gameArea);
    case "wasm":
      try {
        return await wasmBuildMaskFromUnionInput(input, gameArea);
      } catch {
        return buildMaskFromUnionInputTs(input, gameArea);
      }
    case "dual": {
      const tsResult = buildMaskFromUnionInputTs(input, gameArea);
      try {
        const wasmResult = await wasmBuildMaskFromUnionInput(input, gameArea);
        if (
          !maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea))
        ) {
          console.warn(
            "[geometry] mask kernel dual mismatch (buildMaskFromUnionInput)",
          );
        }
      } catch (error) {
        console.warn(
          "[geometry] mask kernel dual wasm failed (buildMaskFromUnionInput)",
          error,
        );
      }
      return tsResult;
    }
    default:
      return assertNever(mode);
  }
}

async function buildEndGameMaskFromDisks(
  gameArea: GameAreaGeometry,
  disks: readonly DiskSpec[],
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  switch (mode) {
    case "ts":
      return buildEndGameMaskFromDisksTs(gameArea, disks);
    case "wasm":
      try {
        return await wasmBuildEndGameMaskFromDisks(gameArea, disks);
      } catch {
        return buildEndGameMaskFromDisksTs(gameArea, disks);
      }
    case "dual": {
      const tsResult = buildEndGameMaskFromDisksTs(gameArea, disks);
      try {
        const wasmResult = await wasmBuildEndGameMaskFromDisks(gameArea, disks);
        if (
          !maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea))
        ) {
          console.warn(
            "[geometry] mask kernel dual mismatch (buildEndGameMaskFromDisks)",
          );
        }
      } catch (error) {
        console.warn(
          "[geometry] mask kernel dual wasm failed (buildEndGameMaskFromDisks)",
          error,
        );
      }
      return tsResult;
    }
    default:
      return assertNever(mode);
  }
}

expose({ buildMaskFromUnionInput, buildEndGameMaskFromDisks });
