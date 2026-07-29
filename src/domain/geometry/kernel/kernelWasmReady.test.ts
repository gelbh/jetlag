import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks wave-1 entrypoints including geodesic ready", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(true);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(true);
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
});
