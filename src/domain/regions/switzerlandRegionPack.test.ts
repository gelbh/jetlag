import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/switzerland");
const CANTON_IDS = [
  "zurich",
  "bern",
  "lucerne",
  "uri",
  "schwyz",
  "obwalden",
  "nidwalden",
  "glarus",
  "zug",
  "fribourg",
  "solothurn",
  "basel-stadt",
  "basel-landschaft",
  "schaffhausen",
  "appenzell-ausserrhoden",
  "appenzell-innerrhoden",
  "st-gallen",
  "graubunden",
  "aargau",
  "thurgau",
  "ticino",
  "vaud",
  "valais",
  "neuchatel",
  "geneva",
  "jura",
] as const;

describe("switzerland region pack wiring", () => {
  it("registers switzerland in the pack id union", () => {
    expect(isRegionPackId("switzerland")).toBe(true);
    expect(REGION_PACK_IDS).toContain("switzerland");
  });

  it("exposes Switzerland display label and canton/municipality overrides", () => {
    expect(regionPackDisplayLabel("switzerland")).toBe("Switzerland");
    const config = getRegionPackConfig("switzerland");
    expect(config?.subregionPropertyKey).toBe("cantonId");
    expect(config?.matchingLabelOverrides.admin_division_3?.label).toBe("Canton");
    expect(config?.matchingLabelOverrides.admin_division_4?.label).toBe("Municipality");
    expect(config?.geoAssets.primary).toBe("/geo/switzerland/cantons.geojson");
    expect(config?.geoAssets.secondary).toBe("/geo/switzerland/municipalities.geojson");
    expect(config?.geoAssets.secondaryBySubregion?.("bern")).toBe(
      "/geo/switzerland/municipalities/bern.geojson",
    );
  });
});

describe("switzerland geo assets", () => {
  it("ships 26 cantons with cantonId", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "cantons.geojson"), "utf8"));
    expect(collection.features).toHaveLength(26);
    const ids = collection.features
      .map((f: { properties: { cantonId: string } }) => f.properties.cantonId)
      .sort();
    expect(ids).toEqual([...CANTON_IDS].sort());
  });

  it("ships municipality slices for every cantonId", () => {
    for (const cantonId of CANTON_IDS) {
      const path = resolve(root, `municipalities/${cantonId}.geojson`);
      expect(existsSync(path), path).toBe(true);
      const collection = JSON.parse(readFileSync(path, "utf8"));
      expect(collection.features.length).toBeGreaterThan(0);
      for (const feature of collection.features) {
        expect(feature.properties.cantonId).toBe(cantonId);
        expect(typeof feature.properties.municipalityId).toBe("string");
        expect(typeof feature.properties.name).toBe("string");
      }
    }
  });
});
