import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { NearRegionBatchInput } from "./nearRegionWasm";
import type { DiskSpec, GameAreaGeometry, PolygonFeature } from "./types";

const nearRegionWasm = createLazyWasmImport(() => import("./nearRegionWasm"));

export type NearRegionBatchParams = {
  segments: readonly Feature<LineString>[];
  distanceMeters: number;
  disks: readonly DiskSpec[];
  gameArea: GameAreaGeometry;
  mode?: NearRegionBatchInput["mode"];
  divisions?: number;
};

export async function dispatchNearRegionBatch(
  params: NearRegionBatchParams,
): Promise<PolygonFeature | null> {
  const input: NearRegionBatchInput = {
    segments: params.segments,
    distanceMeters: params.distanceMeters,
    disks: params.disks,
    gameArea: params.gameArea,
    mode: params.mode,
    divisions: params.divisions,
  };

  return dispatchKernel({
    entrypoint: "nearRegionBatch",
    label: "nearRegionBatch",
    runWasm: async () => {
      const wasm = await nearRegionWasm.load();
      return wasm.wasmBuildNearRegion(input);
    },
  });
}

/** Public alias; callers may import either name. */
export const runNearRegionBatch = dispatchNearRegionBatch;
