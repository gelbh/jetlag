import type { Feature, LineString } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import type { PolygonFeature } from "./types";

const geodesicWasm = createLazyWasmImport(() => import("./geodesicWasm"));

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
  });
}

/** Public alias; callers may import either name. */
export const runGeodesicLineBuffer = dispatchGeodesicLineBuffer;
