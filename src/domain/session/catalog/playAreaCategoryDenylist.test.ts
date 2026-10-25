import { describe, expect, it } from "vitest";
import { REGION_PACK_IDS } from "../../regions/regionPack";
import { packCategoryDenylist } from "./playAreaCategoryDenylist";

describe("packCategoryDenylist", () => {
  it("includes high_speed_rail_line for Dublin", () => {
    expect(packCategoryDenylist("dublin").has("high_speed_rail_line")).toBe(true);
  });

  it("does not denylist high_speed_rail_line for Tokyo", () => {
    expect(packCategoryDenylist("tokyo").has("high_speed_rail_line")).toBe(false);
  });

  it("returns a Set for every region pack id", () => {
    for (const packId of REGION_PACK_IDS) {
      const denylist = packCategoryDenylist(packId);
      expect(denylist).toBeInstanceOf(Set);
    }
  });
});
