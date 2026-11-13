import { describe, expect, it, vi } from "vitest";
import {
  attachMapLibreShaderCompileWindowListener,
  isMapLibreShaderCompileFailure,
} from "./mapLibreShaderCompileFailure";

describe("isMapLibreShaderCompileFailure", () => {
  it("matches fragment and vertex compile messages", () => {
    expect(isMapLibreShaderCompileFailure("Could not compile fragment shader: ")).toBe(true);
    expect(isMapLibreShaderCompileFailure("Could not compile vertex shader: oops")).toBe(true);
    expect(isMapLibreShaderCompileFailure(new Error("Could not compile fragment shader: "))).toBe(
      true,
    );
  });

  it("rejects unrelated errors", () => {
    expect(isMapLibreShaderCompileFailure("Failed to initialize WebGL")).toBe(false);
    expect(isMapLibreShaderCompileFailure(new Error("style load failed"))).toBe(false);
    expect(isMapLibreShaderCompileFailure(null)).toBe(false);
    expect(isMapLibreShaderCompileFailure(undefined)).toBe(false);
  });
});

describe("attachMapLibreShaderCompileWindowListener", () => {
  it("notifies on matching window error and preventDefaults", () => {
    const onFailure = vi.fn();
    const detach = attachMapLibreShaderCompileWindowListener(onFailure);

    const event = new ErrorEvent("error", {
      message: "Could not compile fragment shader: ",
      error: new Error("Could not compile fragment shader: "),
      cancelable: true,
    });
    const prevented = !window.dispatchEvent(event);

    expect(prevented).toBe(true);
    expect(onFailure).toHaveBeenCalledTimes(1);

    detach();
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "Could not compile fragment shader: ",
        cancelable: true,
      }),
    );
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated window errors", () => {
    const onFailure = vi.fn();
    const detach = attachMapLibreShaderCompileWindowListener(onFailure);

    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "ResizeObserver loop limit exceeded",
        cancelable: true,
      }),
    );
    expect(onFailure).not.toHaveBeenCalled();
    detach();
  });
});
