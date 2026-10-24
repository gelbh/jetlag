import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";
import { isSydneyRegionPack, SYDNEY_REGION_PACK_ID } from "./sydneyRegionPack";

const root = resolve(import.meta.dirname, "../../../public/geo/sydney");

const GREATER_SYDNEY_LGA_NAMES = [
  "Bayside (NSW)",
  "Blacktown",
  "Blue Mountains",
  "Burwood",
  "Camden",
  "Campbelltown (NSW)",
  "Canada Bay",
  "Canterbury-Bankstown",
  "Cumberland",
  "Fairfield",
  "Georges River",
  "Hawkesbury",
  "Hornsby",
  "Hunters Hill",
  "Inner West",
  "Ku-ring-gai",
  "Lane Cove",
  "Liverpool",
  "Mosman",
  "North Sydney",
  "Northern Beaches",
  "Parramatta",
  "Penrith",
  "Randwick",
  "Ryde",
  "Strathfield",
  "Sutherland",
  "Sydney",
  "The Hills",
  "Waverley",
  "Willoughby",
  "Wollondilly",
  "Woollahra",
] as const;

describe("sydney region pack wiring", () => {
  it("registers sydney in the pack id union", () => {
    expect(isRegionPackId("sydney")).toBe(true);
    expect(REGION_PACK_IDS).toContain("sydney");
    expect(isSydneyRegionPack(SYDNEY_REGION_PACK_ID)).toBe(true);
  });

  it("exposes Sydney display label and LGA overrides", () => {
    expect(regionPackDisplayLabel("sydney")).toBe("Sydney");
    const config = getRegionPackConfig("sydney");
    expect(config?.subregionPropertyKey).toBe("lgaId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Local Government Area");
    expect(config?.measuringLabelOverrides.admin3_border?.label).toBe("LGA border");
    expect(config?.geoAssets.primary).toBe("/geo/sydney/lgas.geojson");
    expect(config?.geoAssets.playArea).toBe("/geo/sydney/playArea.geojson");
    expect(config?.geoAssets.secondary).toBe("/geo/sydney/sals.geojson");
    // Per-LGA SAL slices deferred; full metro file only until Task 3 geo ships.
    expect(config?.geoAssets.secondaryBySubregion).toBeUndefined();
    expect(config?.matchingLabelOverrides.admin_division_4?.label).toBe("Suburb / Locality");
    expect(config?.measuringLabelOverrides.admin4_border?.label).toBe("Suburb / Locality border");
    expect(config?.geoAssets.matchingLevel4).toBeUndefined();
    expect(config?.geoAssets.matchingLevel6).toBeUndefined();
  });

  it("hides country/province matching and enables SAL secondary", () => {
    const config = getRegionPackConfig("sydney");
    expect(config?.unsupportedMatching.has("admin_division_1")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_2")).toBe(true);
    expect(config?.unsupportedMatching.has("admin_division_4")).toBe(false);
    expect(config?.unsupportedBorders.has("admin4_border")).toBe(false);
    expect(config?.unsupportedMatching.has("admin_division_3")).toBe(false);
    expect(config?.unsupportedBorders.has("admin3_border")).toBe(false);
  });
});

describe("sydney geo assets", () => {
  it("ships Greater Sydney LGA cluster including Strathfield and City of Sydney", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "lgas.geojson"), "utf8")) as {
      features: Array<{ properties: { name: string; lgaId: string } }>;
    };
    expect(collection.features).toHaveLength(GREATER_SYDNEY_LGA_NAMES.length);
    const names = collection.features.map((f) => f.properties.name).sort();
    expect(names).toEqual([...GREATER_SYDNEY_LGA_NAMES].sort());
    expect(names).toContain("Strathfield");
    expect(names).toContain("Sydney");
    for (const feature of collection.features) {
      expect(typeof feature.properties.lgaId).toBe("string");
      expect(feature.properties.lgaId.length).toBeGreaterThan(0);
    }
  });

  it("ships playArea, attribution, and pack matrix files", () => {
    expect(existsSync(resolve(root, "playArea.geojson"))).toBe(true);
    expect(existsSync(resolve(root, "coastline.json"))).toBe(true);
    expect(existsSync(resolve(root, "sea_level_seed.json"))).toBe(true);
    expect(existsSync(resolve(root, "international_border.json"))).toBe(true);
    expect(existsSync(resolve(root, "ATTRIBUTION.txt"))).toBe(true);
    for (const category of PACK_GEO_POINT_CATEGORIES) {
      expect(existsSync(resolve(root, `poi/${category}.json`)), category).toBe(true);
    }
  });
});
