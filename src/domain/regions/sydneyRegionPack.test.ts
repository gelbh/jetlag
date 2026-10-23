import { describe, expect, it } from "vitest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";
import { isSydneyRegionPack, SYDNEY_REGION_PACK_ID } from "./sydneyRegionPack";

describe("sydney region pack wiring", () => {
  it("registers sydney in the pack id union", () => {
    expect(isRegionPackId("sydney")).toBe(true);
    expect(REGION_PACK_IDS).toContain("sydney");
    expect(isSydneyRegionPack(SYDNEY_REGION_PACK_ID)).toBe(true);
  });

  it("exposes Sydney display label and LGA overrides", () => {
    expect(regionPackDisplayLabel("sydney")).toBe("Sydney");
    const config = getRegionPackConfig("sydney");
    expect(config?.subregionPropertyKey).toBe("lgaId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Local Government Area");
    expect(config?.measuringLabelOverrides.admin3_border?.label).toBe("LGA border");
    expect(config?.geoAssets.primary).toBe("/geo/sydney/lgas.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
    expect(config?.geoAssets.matchingLevel4).toBeUndefined();
    expect(config?.geoAssets.matchingLevel6).toBeUndefined();
  });

  it("hides country/province matching and single-depth admin4", () => {
    const config = getRegionPackConfig("sydney");
    expect(config?.unsupportedMatching.has("admin_division_1")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_2")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});
