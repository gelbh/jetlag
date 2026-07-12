import { describe, expect, it } from "vitest";
import { resolveAdminSessionAreaLabel } from "./adminSessionAreaLabel";

describe("resolveAdminSessionAreaLabel", () => {
  it("prefers the persisted game area label", () => {
    expect(
      resolveAdminSessionAreaLabel({
        gameAreaLabel: "  Galway City  ",
        regionPackId: "dublin",
      }),
    ).toBe("Galway City");
  });

  it("resolves bundled subregion labels", () => {
    expect(
      resolveAdminSessionAreaLabel({
        regionPackId: "nyc",
        regionPackSubregionId: "manhattan",
      }),
    ).toBe("Manhattan, New York City, USA");
  });

  it("falls back to metro preset and transit labels", () => {
    expect(
      resolveAdminSessionAreaLabel({
        regionPackId: "nyc",
      }),
    ).toBe("New York City, USA");

    expect(
      resolveAdminSessionAreaLabel({
        transitMetroId: "dublin",
      }),
    ).toBe("Dublin");
  });

  it("returns null when no area hints exist", () => {
    expect(resolveAdminSessionAreaLabel({})).toBeNull();
  });
});
