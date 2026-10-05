import { describe, expect, it } from "vitest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

describe("switzerland region pack wiring", () => {
  it("registers switzerland in the pack id union", () => {
    expect(isRegionPackId("switzerland")).toBe(true);
    expect(REGION_PACK_IDS).toContain("switzerland");
  });

  it("exposes Switzerland display label and canton/municipality overrides", () => {
    expect(regionPackDisplayLabel("switzerland")).toBe("Switzerland");
    const config = getRegionPackConfig("switzerland");
    expect(config?.subregionPropertyKey).toBe("cantonId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Canton");
    expect(config?.matchingLabelOverrides.admin_division_4?.label).toBe("Municipality");
    expect(config?.geoAssets.primary).toBe("/geo/switzerland/cantons.geojson");
    expect(config?.geoAssets.secondary).toBe("/geo/switzerland/municipalities.geojson");
    expect(config?.geoAssets.secondaryBySubregion?.("bern")).toBe(
      "/geo/switzerland/municipalities/bern.geojson",
    );
  });
});
