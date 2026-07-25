import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks halfPlane ready; geodesic stays pending until its flip", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(true);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(false);
  });
});

describe("shouldUseWasm", () => {
  it("honors mode for ready halfPlane; keeps geodesic on TS", () => {
    expect(shouldUseWasm("wasm", "halfPlane")).toBe(true);
    expect(shouldUseWasm("wasm", "geodesicLineBuffer")).toBe(false);
    expect(shouldUseWasm("wasm", "maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("ts", "halfPlane")).toBe(false);
    expect(shouldUseWasm("dual", "halfPlane")).toBe(true);
    expect(shouldUseWasm("dual", "geodesicLineBuffer")).toBe(false);
  });
});
