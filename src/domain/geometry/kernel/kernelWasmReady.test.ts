import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks wave-1 entrypoints including geodesic ready", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(true);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(true);
  });

  it("keeps spatial voronoi not ready until perf gate; tentacle and near-region batch ready", () => {
    expect(KERNEL_WASM_READY.spatialVoronoi).toBe(false);
    expect(KERNEL_WASM_READY.nearRegionBatch).toBe(true);
    expect(KERNEL_WASM_READY.tentacleEliminationRegion).toBe(true);
  });
});

describe("shouldUseWasm", () => {
  it("honors mode for ready entrypoints", () => {
    expect(shouldUseWasm("wasm", "halfPlane")).toBe(true);
    expect(shouldUseWasm("wasm", "geodesicLineBuffer")).toBe(true);
    expect(shouldUseWasm("wasm", "maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("wasm", "nearRegionBatch")).toBe(true);
    expect(shouldUseWasm("ts", "halfPlane")).toBe(false);
    expect(shouldUseWasm("dual", "halfPlane")).toBe(true);
    expect(shouldUseWasm("dual", "geodesicLineBuffer")).toBe(true);
    expect(shouldUseWasm("dual", "nearRegionBatch")).toBe(true);
  });

  it("returns false for spatialVoronoi; true for tentacle and nearRegionBatch when ready", () => {
    expect(shouldUseWasm("wasm", "spatialVoronoi")).toBe(false);
    expect(shouldUseWasm("wasm", "nearRegionBatch")).toBe(true);
    expect(shouldUseWasm("wasm", "tentacleEliminationRegion")).toBe(true);
    expect(shouldUseWasm("dual", "spatialVoronoi")).toBe(false);
    expect(shouldUseWasm("dual", "nearRegionBatch")).toBe(true);
    expect(shouldUseWasm("dual", "tentacleEliminationRegion")).toBe(true);
  });
});
