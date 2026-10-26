import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AMSTERDAM_STADSDELEN } from "./bundledPresets/amsterdam";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/amsterdam");
const STADSDEL_IDS = AMSTERDAM_STADSDELEN.map((stadsdeel) => stadsdeel.id);

describe("amsterdam region pack wiring", () => {
  it("registers amsterdam in the pack id union", () => {
    expect(isRegionPackId("amsterdam")).toBe(true);
    expect(REGION_PACK_IDS).toContain("amsterdam");
  });

  it("exposes Amsterdam display label and stadsdeel overrides", () => {
    expect(regionPackDisplayLabel("amsterdam")).toBe("Amsterdam");
    const config = getRegionPackConfig("amsterdam");
    expect(config?.subregionPropertyKey).toBe("stadsdeelId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Stadsdeel");
    expect(config?.geoAssets.primary).toBe("/geo/amsterdam/stadsdelen.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/amsterdam/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("amsterdam");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("amsterdam geo assets", () => {
  it("ships 9 stadsdelen with locked stadsdeelId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "stadsdelen.geojson"), "utf8"));
    expect(collection.features).toHaveLength(9);
    const ids = collection.features
      .map((f: { properties: { stadsdeelId: string } }) => f.properties.stadsdeelId)
      .sort();
    expect(ids).toEqual([...STADSDEL_IDS].sort());
    for (const feature of collection.features) {
      expect(typeof feature.properties.name).toBe("string");
      expect(feature.properties.name.length).toBeGreaterThan(0);
    }
  });

  it("ships city outline and pack matrix files", () => {
    expect(existsSync(resolve(root, "city.geojson"))).toBe(true);
    expect(existsSync(resolve(root, "coastline.json"))).toBe(true);
    expect(existsSync(resolve(root, "sea_level_seed.json"))).toBe(true);
    expect(existsSync(resolve(root, "international_border.json"))).toBe(true);
    expect(existsSync(resolve(root, "ATTRIBUTION.txt"))).toBe(true);
    for (const category of PACK_GEO_POINT_CATEGORIES) {
      expect(existsSync(resolve(root, `poi/${category}.json`)), category).toBe(true);
    }
  });
});
