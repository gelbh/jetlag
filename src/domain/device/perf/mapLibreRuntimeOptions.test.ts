import { describe, expect, it } from "vitest";
import { mapLibreRuntimeOptions } from "./mapLibreRuntimeOptions";

describe("mapLibreRuntimeOptions", () => {
  it("omits overrides when not low-power (keep MapLibre defaults)", () => {
    expect(mapLibreRuntimeOptions(false)).toEqual({});
  });

  it("cuts fade and tile cache in low-power", () => {
    expect(mapLibreRuntimeOptions(true)).toEqual({
      fadeDuration: 0,
      maxTileCacheSize: 50,
    });
  });
});
