import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WROCLAW_DZIELNICE } from "./bundledPresets/wroclaw";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/wroclaw");
const DZIELNICA_IDS = WROCLAW_DZIELNICE.map((dzielnica) => dzielnica.id);

describe("wroclaw region pack wiring", () => {
  it("registers wroclaw in the pack id union", () => {
    expect(isRegionPackId("wroclaw")).toBe(true);
    expect(REGION_PACK_IDS).toContain("wroclaw");
  });

  it("exposes Wrocław display label and dzielnica overrides", () => {
    expect(regionPackDisplayLabel("wroclaw")).toBe("Wrocław");
    const config = getRegionPackConfig("wroclaw");
    expect(config?.subregionPropertyKey).toBe("dzielnicaId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Dzielnica");
    expect(config?.geoAssets.primary).toBe("/geo/wroclaw/dzielnice.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/wroclaw/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("wroclaw");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("wroclaw geo assets", () => {
  it("ships 48 dzielnice with locked dzielnicaId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "dzielnice.geojson"), "utf8"));
    expect(collection.features).toHaveLength(48);
    const ids = collection.features
      .map((f: { properties: { dzielnicaId: string } }) => f.properties.dzielnicaId)
      .sort();
    expect(ids).toEqual([...DZIELNICA_IDS].sort());
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
