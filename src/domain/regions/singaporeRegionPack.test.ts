import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SINGAPORE_PLANNING_AREAS } from "./bundledPresets/singapore";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/singapore");
const PLANNING_AREA_IDS = SINGAPORE_PLANNING_AREAS.map((area) => area.id);

describe("singapore region pack wiring", () => {
  it("registers singapore in the pack id union", () => {
    expect(isRegionPackId("singapore")).toBe(true);
    expect(REGION_PACK_IDS).toContain("singapore");
  });

  it("exposes Singapore display label and planning area overrides", () => {
    expect(regionPackDisplayLabel("singapore")).toBe("Singapore");
    const config = getRegionPackConfig("singapore");
    expect(config?.subregionPropertyKey).toBe("planningAreaId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Planning area");
    expect(config?.geoAssets.primary).toBe("/geo/singapore/planning-areas.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/singapore/city.geojson");
    expect(config?.geoAssets.secondary).toBeUndefined();
  });

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("singapore");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("singapore geo assets", () => {
  it("ships 55 planning areas with locked planningAreaId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "planning-areas.geojson"), "utf8"));
    expect(collection.features).toHaveLength(55);
    const ids = collection.features
      .map((f: { properties: { planningAreaId: string } }) => f.properties.planningAreaId)
      .sort();
    expect(ids).toEqual([...PLANNING_AREA_IDS].sort());
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
