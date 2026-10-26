import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BERLIN_BEZIRKE } from "./bundledPresets/berlin";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/berlin");
const BEZIRK_IDS = BERLIN_BEZIRKE.map((bezirk) => bezirk.id);

describe("berlin region pack wiring", () => {
  it("registers berlin in the pack id union", () => {
    expect(isRegionPackId("berlin")).toBe(true);
    expect(REGION_PACK_IDS).toContain("berlin");
  });

  it("exposes Berlin display label and Bezirk overrides", () => {
    expect(regionPackDisplayLabel("berlin")).toBe("Berlin");
    const config = getRegionPackConfig("berlin");
    expect(config?.subregionPropertyKey).toBe("bezirkId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Bezirk");
    expect(config?.geoAssets.primary).toBe("/geo/berlin/bezirke.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/berlin/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("berlin");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("berlin geo assets", () => {
  it("ships 12 bezirke with locked bezirkId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "bezirke.geojson"), "utf8"));
    expect(collection.features).toHaveLength(12);
    const ids = collection.features
      .map((f: { properties: { bezirkId: string } }) => f.properties.bezirkId)
      .sort();
    expect(ids).toEqual([...BEZIRK_IDS].sort());
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
