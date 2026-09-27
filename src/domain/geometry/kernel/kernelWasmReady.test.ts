import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks all entrypoints ready", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(true);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(true);
    expect(KERNEL_WASM_READY.spatialVoronoi).toBe(true);
    expect(KERNEL_WASM_READY.nearRegionBatch).toBe(true);
    expect(KERNEL_WASM_READY.tentacleEliminationRegion).toBe(true);
  });
});

describe("shouldUseWasm", () => {
  it("returns true for ready entrypoints", () => {
    expect(shouldUseWasm("halfPlane")).toBe(true);
    expect(shouldUseWasm("geodesicLineBuffer")).toBe(true);
    expect(shouldUseWasm("maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("nearRegionBatch")).toBe(true);
    expect(shouldUseWasm("spatialVoronoi")).toBe(true);
    expect(shouldUseWasm("tentacleEliminationRegion")).toBe(true);
  });
});
