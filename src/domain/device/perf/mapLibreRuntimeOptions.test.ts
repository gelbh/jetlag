import { describe, expect, it } from "vitest";
import { mapLibreRuntimeOptions } from "./mapLibreRuntimeOptions";

describe("mapLibreRuntimeOptions", () => {
  it("keeps default fade and tile cache when not low-power", () => {
    expect(mapLibreRuntimeOptions(false)).toEqual({
      fadeDuration: 300,
      maxTileCacheSize: 100,
    });
  });

  it("cuts fade and tile cache in low-power", () => {
    expect(mapLibreRuntimeOptions(true)).toEqual({
      fadeDuration: 0,
      maxTileCacheSize: 50,
    });
  });
});
