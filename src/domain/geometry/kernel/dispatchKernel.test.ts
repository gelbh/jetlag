import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchKernel, dispatchKernelSync } from "./dispatchKernel";

describe("dispatchKernel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns TS when entrypoint is not ready even in wasm mode", async () => {
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => "wasm");

    const result = await dispatchKernel({
      mode: "wasm",
      entrypoint: "halfPlane",
      label: "halfPlane",
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
      entrypoint: "maskFromUnionInput",
      label: "mask",
      runTs,
      runWasm,
    });

    expect(result).toBe("wasm");
    expect(runWasm).toHaveBeenCalledOnce();
    expect(runTs).not.toHaveBeenCalled();
  });

  it("falls back to TS when WASM throws in wasm mode", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => {
      throw new Error("boom");
    });

    const result = await dispatchKernel({
      mode: "wasm",
      entrypoint: "maskFromUnionInput",
      label: "mask",
      runTs,
      runWasm,
    });

    expect(result).toBe("ts");
    expect(warn).toHaveBeenCalled();
  });

  it("dual returns TS and compares when ready", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => "wasm");
    const matches = vi.fn(() => false);

    const result = await dispatchKernel({
      mode: "dual",
      entrypoint: "maskFromUnionInput",
      label: "mask",
      runTs,
      runWasm,
      matches,
    });

    expect(result).toBe("ts");
    expect(runTs).toHaveBeenCalledOnce();
    expect(runWasm).toHaveBeenCalledOnce();
    expect(matches).toHaveBeenCalledWith("wasm", "ts");
    expect(warn).toHaveBeenCalled();
  });

  it("dual skips WASM when entrypoint not ready", async () => {
    const runTs = vi.fn(() => "ts");
    const runWasm = vi.fn(async () => "wasm");

    const result = await dispatchKernel({
      mode: "dual",
      entrypoint: "geodesicLineBuffer",
      label: "geodesic",
      runTs,
      runWasm,
    });

    expect(result).toBe("ts");
    expect(runTs).toHaveBeenCalledOnce();
    expect(runWasm).not.toHaveBeenCalled();
  });
});

describe("dispatchKernelSync", () => {
  it("returns TS when entrypoint is not ready", () => {
    const runTs = vi.fn(() => "ts");
    expect(
      dispatchKernelSync({
        mode: "wasm",
        entrypoint: "halfPlane",
        runTs,
      }),
    ).toBe("ts");
    expect(runTs).toHaveBeenCalledOnce();
  });

  it("throws when WASM would run for a ready entrypoint", () => {
    expect(() =>
      dispatchKernelSync({
        mode: "wasm",
        entrypoint: "maskFromUnionInput",
        runTs: () => "ts",
      }),
    ).toThrow(/sync kernel path cannot use wasm/);
  });
});
