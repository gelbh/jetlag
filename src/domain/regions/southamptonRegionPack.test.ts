import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/southampton");
const WARD_IDS = [
  "banister-and-polygon",
  "bargate",
  "bassett",
  "bevois",
  "bitterne-park",
  "coxford",
  "freemantle",
  "harefield",
  "millbrook",
  "peartree",
  "portswood",
  "redbridge",
  "shirley",
  "sholing",
  "swaythling",
  "thornhill",
  "woolston",
] as const;

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

  it("hard-hides admin4 matching and borders for the single-depth pack", () => {
    const config = getRegionPackConfig("southampton");
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(true);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("southampton geo assets", () => {
  it("ships 17 wards with locked wardId values", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "wards.geojson"), "utf8"));
    expect(collection.features).toHaveLength(17);
    const ids = collection.features
      .map((f: { properties: { wardId: string } }) => f.properties.wardId)
      .sort();
    expect(ids).toEqual([...WARD_IDS].sort());
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
