import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { UTRECHT_WIJKEN } from "./bundledPresets/utrecht";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/utrecht");
const WIJK_IDS = UTRECHT_WIJKEN.map((wijk) => wijk.id);

describe("utrecht region pack wiring", () => {
  it("registers utrecht in the pack id union", () => {
    expect(isRegionPackId("utrecht")).toBe(true);
    expect(REGION_PACK_IDS).toContain("utrecht");
  });

  it("exposes Utrecht display label and wijk overrides", () => {
    expect(regionPackDisplayLabel("utrecht")).toBe("Utrecht");
    const config = getRegionPackConfig("utrecht");
    expect(config?.subregionPropertyKey).toBe("wijkId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Wijk");
    expect(config?.geoAssets.primary).toBe("/geo/utrecht/wijken.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/utrecht/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("utrecht");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("utrecht geo assets", () => {
  it("ships 10 wijken with locked wijkId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "wijken.geojson"), "utf8"));
    expect(collection.features).toHaveLength(10);
    const ids = collection.features
      .map((f: { properties: { wijkId: string } }) => f.properties.wijkId)
      .sort();
    expect(ids).toEqual([...WIJK_IDS].sort());
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
