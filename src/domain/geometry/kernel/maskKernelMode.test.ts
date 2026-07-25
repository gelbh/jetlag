import { describe, expect, it } from "vitest";
import { resolveMaskKernelMode } from "./maskKernelMode";

describe("resolveMaskKernelMode", () => {
  it("defaults to ts", () => {
    expect(resolveMaskKernelMode({})).toBe("ts");
  });

  it("localStorage overrides env", () => {
    expect(
      resolveMaskKernelMode({ envValue: "ts", localStorageValue: "dual" }),
    ).toBe("dual");
  });

  it("invalid values fall back to ts", () => {
    expect(resolveMaskKernelMode({ envValue: "nope" })).toBe("ts");
  });

  it("uses env when localStorage is empty", () => {
    expect(
      resolveMaskKernelMode({ envValue: "wasm", localStorageValue: null }),
    ).toBe("wasm");
  });

  it("ignores invalid localStorage and uses env", () => {
    expect(
      resolveMaskKernelMode({
        envValue: "dual",
        localStorageValue: "invalid",
      }),
    ).toBe("dual");
  });
});
