import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks wave-1 entrypoints including geodesic ready", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(true);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(true);
  });

  it("keeps wave-2 tentacle/voronoi entrypoints not ready", () => {
    expect(KERNEL_WASM_READY.spatialVoronoi).toBe(false);
    expect(KERNEL_WASM_READY.tentacleEliminationRegion).toBe(false);
  });
});

describe("shouldUseWasm", () => {
  it("honors mode for ready entrypoints", () => {
    expect(shouldUseWasm("wasm", "halfPlane")).toBe(true);
    expect(shouldUseWasm("wasm", "geodesicLineBuffer")).toBe(true);
    expect(shouldUseWasm("wasm", "maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("ts", "halfPlane")).toBe(false);
    expect(shouldUseWasm("dual", "halfPlane")).toBe(true);
    expect(shouldUseWasm("dual", "geodesicLineBuffer")).toBe(true);
  });

  it("returns false for wave-2 entrypoints even in wasm mode", () => {
    expect(shouldUseWasm("wasm", "spatialVoronoi")).toBe(false);
    expect(shouldUseWasm("wasm", "tentacleEliminationRegion")).toBe(false);
    expect(shouldUseWasm("dual", "spatialVoronoi")).toBe(false);
    expect(shouldUseWasm("dual", "tentacleEliminationRegion")).toBe(false);
  });
});
