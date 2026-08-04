import { describe, expect, it } from "vitest";
import {
  BASE_MEASURING_CATALOG,
  COASTLINE_DEFINITION,
  CUSTOM_PACK_GATED_MEASURING_IDS,
  MEASURING_CATALOG,
} from "./measuringCatalog";

describe("measuringCatalog rulebook alignment", () => {
  it("defines coastline width as 2 km", () => {
    expect(COASTLINE_DEFINITION).toContain("2 km");
    expect(COASTLINE_DEFINITION.toLowerCase()).not.toContain("one mile");
  });

  it("keeps book base measuring catalog at 20 options", () => {
    expect(BASE_MEASURING_CATALOG).toHaveLength(20);
    expect(MEASURING_CATALOG).toHaveLength(23);
    expect(CUSTOM_PACK_GATED_MEASURING_IDS).toEqual([
      "admin3_border",
      "admin4_border",
      "custom_place",
    ]);
  });
});
