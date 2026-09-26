import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import type { PolygonFeature } from "./types";

const geodesicWasm = createLazyWasmImport(() => import("./geodesicWasm"));

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

export async function dispatchGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "geodesicLineBuffer",
    label: "geodesicLineBuffer",
    runTs: () =>
      geodesicLineBuffer(segment, distanceMeters, sampleSpacingMeters),
    runWasm: async () => {
      const wasm = await geodesicWasm.load();
      return wasm.wasmGeodesicLineBuffer(
        segment,
        distanceMeters,
        sampleSpacingMeters,
      );
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(
        wasmResult,
        tsResult,
        topologyBboxFromResults(wasmResult, tsResult),
      ),
  });
}

/** Public alias; callers may import either name. */
export const runGeodesicLineBuffer = dispatchGeodesicLineBuffer;
