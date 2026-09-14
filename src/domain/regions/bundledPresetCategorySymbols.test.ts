import { describe, expect, it } from "vitest";
import {
  districtNumberFromSubregionId,
  glyphIdForHierarchyCategory,
} from "./bundledPresetCategorySymbols";

describe("bundledPresetCategorySymbols", () => {
  it("maps subdivision folder categories to glyphs", () => {
    expect(glyphIdForHierarchyCategory("Local authorities")).toBe(
      "local-authorities",
    );
    expect(glyphIdForHierarchyCategory("Wards")).toBe("wards");
    expect(glyphIdForHierarchyCategory("Boroughs")).toBe("boroughs");
    expect(glyphIdForHierarchyCategory("Districts")).toBe("districts");
  });

  it("returns null for place categories that use flags", () => {
    expect(glyphIdForHierarchyCategory("Country")).toBeNull();
    expect(glyphIdForHierarchyCategory("Metro")).toBeNull();
  });

  it("parses Portland council district numbers from subregion ids", () => {
    expect(districtNumberFromSubregionId("district-1")).toBe(1);
    expect(districtNumberFromSubregionId("district-5")).toBe(5);
    expect(districtNumberFromSubregionId("manhattan")).toBeNull();
  });
});
