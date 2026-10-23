import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUSTRALIA_STATES } from "./australiaRegionPack";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/australia");
const lockedStateIds = [...AUSTRALIA_STATES].sort();

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
    expect(lockedStateIds).toEqual(["act", "nsw", "nt", "qld", "sa", "tas", "vic", "wa"]);
  });
});

describe("australia geo assets", () => {
  it("ships exactly eight states with locked stateId and name", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "states.geojson"), "utf8")) as {
      features: Array<{ properties: { stateId: string; name: string } }>;
    };
    expect(collection.features).toHaveLength(8);
    const ids = collection.features.map((f) => f.properties.stateId).sort();
    expect(ids).toEqual(lockedStateIds);
    for (const feature of collection.features) {
      expect(typeof feature.properties.name).toBe("string");
      expect(feature.properties.name.length).toBeGreaterThan(0);
    }
  });

  it("ships LGA slices for every stateId with stateId and lgaId", () => {
    for (const stateId of AUSTRALIA_STATES) {
      const path = resolve(root, `lgas/${stateId}.geojson`);
      expect(existsSync(path), path).toBe(true);
      const collection = JSON.parse(readFileSync(path, "utf8")) as {
        features: Array<{ properties: { stateId: string; lgaId: string; name: string } }>;
      };
      expect(collection.features.length).toBeGreaterThan(0);
      for (const feature of collection.features) {
        expect(feature.properties.stateId).toBe(stateId);
        expect(typeof feature.properties.lgaId).toBe("string");
        expect(feature.properties.lgaId.length).toBeGreaterThan(0);
        expect(typeof feature.properties.name).toBe("string");
        expect(feature.properties.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("ships national lgas.geojson with stateIds in the locked set", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "lgas.geojson"), "utf8")) as {
      features: Array<{ properties: { stateId: string; lgaId: string } }>;
    };
    expect(collection.features.length).toBeGreaterThan(0);
    const locked = new Set(AUSTRALIA_STATES);
    for (const feature of collection.features) {
      expect(locked.has(feature.properties.stateId as (typeof AUSTRALIA_STATES)[number])).toBe(
        true,
      );
      expect(typeof feature.properties.lgaId).toBe("string");
    }
  });
});
