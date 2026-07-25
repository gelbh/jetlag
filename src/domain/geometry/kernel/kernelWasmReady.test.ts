import { describe, expect, it } from "vitest";
import { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";

describe("KERNEL_WASM_READY", () => {
  it("marks mask entrypoints ready and extras not ready", () => {
    expect(KERNEL_WASM_READY.maskFromUnionInput).toBe(true);
    expect(KERNEL_WASM_READY.endGameMaskFromDisks).toBe(true);
    expect(KERNEL_WASM_READY.halfPlane).toBe(false);
    expect(KERNEL_WASM_READY.geodesicLineBuffer).toBe(false);
  });
});

describe("shouldUseWasm", () => {
  it("keeps extras on TS even when mode is wasm", () => {
    expect(shouldUseWasm("wasm", "halfPlane")).toBe(false);
    expect(shouldUseWasm("wasm", "geodesicLineBuffer")).toBe(false);
    expect(shouldUseWasm("wasm", "maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("wasm", "endGameMaskFromDisks")).toBe(true);
  });

  it("honors mode for ready entrypoints", () => {
    expect(shouldUseWasm("ts", "maskFromUnionInput")).toBe(false);
    expect(shouldUseWasm("dual", "maskFromUnionInput")).toBe(true);
    expect(shouldUseWasm("dual", "halfPlane")).toBe(false);
  });
});
