import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { PolygonFeature } from "./types";

const unionWasm = createLazyWasmImport(() => import("./unionWasm"));

export async function runUnionPolygonFeatures(
  features: readonly PolygonFeature[],
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    entrypoint: "unionPolygonFeatures",
    label: "unionPolygonFeatures",
    runWasm: async () => {
      const wasm = await unionWasm.load();
      return wasm.wasmUnionPolygonFeatures(features);
    },
  });
}
