import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchKernel } from "./dispatchKernel";

describe("dispatchKernel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("throws when entrypoint is not ready", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", () => ({
      KERNEL_WASM_READY: {
        maskFromUnionInput: true,
        endGameMaskFromDisks: true,
        halfPlane: true,
        geodesicLineBuffer: false,
        unionPolygonFeatures: false,
      },
      shouldUseWasm: (entrypoint: string) =>
        entrypoint !== "geodesicLineBuffer" && entrypoint !== "unionPolygonFeatures",
    }));

    const { dispatchKernel: dispatch } = await import("./dispatchKernel");
    const runWasm = vi.fn(async () => "wasm");

    await expect(
      dispatch({
        entrypoint: "geodesicLineBuffer",
        label: "geodesic",
        runWasm,
      }),
    ).rejects.toThrow(/not wasm-ready/);
    expect(runWasm).not.toHaveBeenCalled();
  });

  it("runUnionPolygonFeatures throws while unionPolygonFeatures ready=false", async () => {
    const { runUnionPolygonFeatures } = await import("./unionKernelRunner");
    await expect(runUnionPolygonFeatures([])).rejects.toThrow(/not wasm-ready/);
  });

  it("uses WASM for ready entrypoints", async () => {
    const runWasm = vi.fn(async () => "wasm");

    const result = await dispatchKernel({
      entrypoint: "halfPlane",
      label: "halfPlane",
      runWasm,
    });

    expect(result).toBe("wasm");
    expect(runWasm).toHaveBeenCalledOnce();
  });

  it("rethrows when WASM throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runWasm = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(
      dispatchKernel({
        entrypoint: "maskFromUnionInput",
        label: "mask",
        runWasm,
      }),
    ).rejects.toThrow("boom");

    expect(warn).toHaveBeenCalled();
  });
});
