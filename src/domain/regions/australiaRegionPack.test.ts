import { describe, expect, it } from "vitest";
import { AUSTRALIA_STATES } from "./australiaRegionPack";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

describe("australia region pack wiring", () => {
  it("registers australia in the pack id union", () => {
    expect(isRegionPackId("australia")).toBe(true);
    expect(REGION_PACK_IDS).toContain("australia");
  });

  it("exposes Australia display label and CED/SED/S/T/LGA overrides", () => {
    expect(regionPackDisplayLabel("australia")).toBe("Australia");
    const config = getRegionPackConfig("australia");
    expect(config?.subregionPropertyKey).toBe("stateId");
    expect(config?.matchingLabelOverrides.admin_division_1?.label).toBe("CED");
    expect(config?.matchingLabelOverrides.admin_division_2?.label).toBe("SED");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("State/Territory");
    expect(config?.matchingLabelOverrides.admin_division_4?.label).toBe("LGA");
    expect(config?.measuringLabelOverrides.admin1_border?.label).toBe("CED border");
    expect(config?.measuringLabelOverrides.admin2_border?.label).toBe("SED border");
    expect(config?.measuringLabelOverrides.admin3_border?.label).toBe("State/Territory border");
    expect(config?.measuringLabelOverrides.admin4_border?.label).toBe("LGA border");
    expect(config?.geoAssets.primary).toBe("/geo/australia/states.geojson");
    expect(config?.geoAssets.secondary).toBe("/geo/australia/lgas.geojson");
    expect(config?.geoAssets.secondaryBySubregion?.("nsw")).toBe("/geo/australia/lgas/nsw.geojson");
  });

  it("keeps all four admin matching categories available", () => {
    const config = getRegionPackConfig("australia");
    expect(config?.unsupportedMatching.has("admin_division_1")).toBe(false);
    expect(config?.unsupportedMatching.has("admin_division_2")).toBe(false);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(false);
    expect(config?.unsupportedBorders.has("international_border")).toBe(true);
    expect(config?.unsupportedBorders.has("admin1_border")).toBe(false);
    expect(config?.unsupportedBorders.has("admin2_border")).toBe(false);
  });

  it("exports the locked eight state/territory ids", () => {
    expect([...AUSTRALIA_STATES].sort()).toEqual(
      ["act", "nsw", "nt", "qld", "sa", "tas", "vic", "wa"].sort(),
    );
  });
});
