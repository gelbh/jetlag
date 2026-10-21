import { describe, expect, it } from "vitest";
import { resolveAskPath } from "./resolveAskPath";

describe("resolveAskPath", () => {
  it("routes classic and absent mode to honor", () => {
    expect(resolveAskPath("classic")).toBe("honor");
    expect(resolveAskPath(undefined)).toBe("honor");
    expect(resolveAskPath(null)).toBe("honor");
  });

  it("routes castleSiege to oracle", () => {
    expect(resolveAskPath("castleSiege")).toBe("oracle");
  });
});
