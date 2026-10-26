import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BRUSSELS_COMMUNES } from "./bundledPresets/brussels";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/brussels");
const COMMUNE_IDS = BRUSSELS_COMMUNES.map((commune) => commune.id);

describe("brussels region pack wiring", () => {
  it("registers brussels in the pack id union", () => {
    expect(isRegionPackId("brussels")).toBe(true);
    expect(REGION_PACK_IDS).toContain("brussels");
  });

  it("exposes Brussels display label and commune overrides", () => {
    expect(regionPackDisplayLabel("brussels")).toBe("Brussels");
    const config = getRegionPackConfig("brussels");
    expect(config?.subregionPropertyKey).toBe("communeId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Commune");
    expect(config?.geoAssets.primary).toBe("/geo/brussels/communes.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/brussels/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("brussels");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("brussels geo assets", () => {
  it("ships 19 communes with locked communeId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "communes.geojson"), "utf8"));
    expect(collection.features).toHaveLength(19);
    const ids = collection.features
      .map((f: { properties: { communeId: string } }) => f.properties.communeId)
      .sort();
    expect(ids).toEqual([...COMMUNE_IDS].sort());
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
