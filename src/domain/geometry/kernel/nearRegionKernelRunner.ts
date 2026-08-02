import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";
import type { NearRegionBatchInput } from "./nearRegionWasm";

type NearRegionWasmApi = typeof import("./nearRegionWasm");

let nearRegionWasmModulePromise: Promise<NearRegionWasmApi> | null = null;

function loadNearRegionWasmModule(): Promise<NearRegionWasmApi> {
  if (!nearRegionWasmModulePromise) {
    nearRegionWasmModulePromise = import("./nearRegionWasm").catch((error) => {
      nearRegionWasmModulePromise = null;
      throw error;
    });
  }
  return nearRegionWasmModulePromise;
}

function topologyBboxFromResults(
  wasmResult: PolygonFeature | null,
  tsResult: PolygonFeature | null,
): { west: number; east: number; south: number; north: number } {
  const feature = tsResult ?? wasmResult;
  if (!feature) {
    return { west: 0, east: 0, south: 0, north: 0 };
  }
  return bboxFromGameArea(feature.geometry);
}

export type NearRegionBatchParams = {
  segments: readonly Feature<LineString>[];
  distanceMeters: number;
  disks: readonly DiskSpec[];
  gameArea: GameAreaGeometry;
  runTs: () => PolygonFeature | null;
};

/** Production near-region batch entrypoint (mode + KERNEL_WASM_READY). */
export async function runNearRegionBatch(
  params: NearRegionBatchParams,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  return dispatchNearRegionBatch(params, mode);
}

/** Mode + KERNEL_WASM_READY dispatch for near-region batch. */
export async function dispatchNearRegionBatch(
  params: NearRegionBatchParams,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  const input: NearRegionBatchInput = {
    segments: params.segments,
    distanceMeters: params.distanceMeters,
    disks: params.disks,
    gameArea: params.gameArea,
  };

  return dispatchKernel({
    mode,
    entrypoint: "nearRegionBatch",
    label: "nearRegionBatch",
    runTs: params.runTs,
    runWasm: async () => {
      const wasm = await loadNearRegionWasmModule();
      return wasm.wasmBuildNearRegion(input);
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(
        wasmResult,
        tsResult,
        topologyBboxFromResults(wasmResult, tsResult),
      ),
  });
}
