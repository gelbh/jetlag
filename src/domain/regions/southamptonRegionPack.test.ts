import { describe, expect, it } from "vitest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

describe("southampton region pack wiring", () => {
  it("registers southampton in the pack id union", () => {
    expect(isRegionPackId("southampton")).toBe(true);
    expect(REGION_PACK_IDS).toContain("southampton");
  });

  it("exposes Southampton display label and ward overrides", () => {
    expect(regionPackDisplayLabel("southampton")).toBe("Southampton");
    const config = getRegionPackConfig("southampton");
    expect(config?.subregionPropertyKey).toBe("wardId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Ward");
    expect(config?.geoAssets.primary).toBe("/geo/southampton/wards.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });
});
