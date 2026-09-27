import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchKernel, dispatchKernelSync } from "./dispatchKernel";

describe("dispatchKernel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns TS when entrypoint is not ready even in wasm mode", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", () => ({
      KERNEL_WASM_READY: {
        maskFromUnionInput: true,
        endGameMaskFromDisks: true,
        halfPlane: true,
        geodesicLineBuffer: false,
      },
      shouldUseWasm: (mode: "wasm", entrypoint: string) => {
        if (entrypoint === "geodesicLineBuffer") {
          return false;
        }
        return mode === "wasm";
      },
    }));

    const { dispatchKernel: dispatch } = await import("./dispatchKernel");
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => "wasm");

    const result = await dispatch({
      mode: "wasm",
      entrypoint: "geodesicLineBuffer",
      label: "geodesic",
      runTs,
      runWasm,
    });

    expect(result).toBe("ts");
    expect(runTs).toHaveBeenCalledOnce();
    expect(runWasm).not.toHaveBeenCalled();
  });

  it("uses WASM for ready entrypoints in wasm mode", async () => {
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => "wasm");

    const result = await dispatchKernel({
      mode: "wasm",
      entrypoint: "halfPlane",
      label: "halfPlane",
      runTs,
      runWasm,
    });

    expect(result).toBe("wasm");
    expect(runWasm).toHaveBeenCalledOnce();
    expect(runTs).not.toHaveBeenCalled();
  });

  it("rethrows when WASM throws in wasm mode", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(
      dispatchKernel({
        mode: "wasm",
        entrypoint: "maskFromUnionInput",
        label: "mask",
        runTs,
        runWasm,
      }),
    ).rejects.toThrow("boom");

    expect(warn).toHaveBeenCalled();
    expect(runTs).not.toHaveBeenCalled();
  });
});

describe("dispatchKernelSync", () => {
  it("throws when WASM would run for a ready entrypoint", () => {
    expect(() =>
      dispatchKernelSync({
        mode: "wasm",
        entrypoint: "halfPlane",
        runTs: () => "ts",
      }),
    ).toThrow(/sync kernel path cannot use wasm/);
  });

  it("throws on sync path when geodesic is ready in wasm mode", () => {
    expect(() =>
      dispatchKernelSync({
        mode: "wasm",
        entrypoint: "geodesicLineBuffer",
        runTs: () => "ts",
      }),
    ).toThrow(/sync kernel path cannot use wasm/);
  });
});
