import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_SEA_LEVEL_SEED_DIVISIONS } from "@/domain/geometry/measuring/seaLevel";
import { AUSTRALIA_STATES } from "./australiaRegionPack";
import { PACK_GEO_POINT_CATEGORIES } from "./packGeoManifest";
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
    expect(config?.geoAssets.primaryBySubregion?.("nsw")).toBe("/geo/australia/states/nsw.geojson");
    expect(config?.geoAssets.matchingLevel4).toBe("/geo/australia/ced.geojson");
    expect(config?.geoAssets.matchingLevel4BySubregion?.("nsw")).toBe(
      "/geo/australia/ced/nsw.geojson",
    );
    expect(config?.geoAssets.matchingLevel6).toBe("/geo/australia/sed.geojson");
    expect(config?.geoAssets.matchingLevel6BySubregion?.("nsw")).toBe(
      "/geo/australia/sed/nsw.geojson",
    );
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

  it("ships STE and CED slices for every stateId", () => {
    for (const stateId of AUSTRALIA_STATES) {
      const stePath = resolve(root, `states/${stateId}.geojson`);
      const cedPath = resolve(root, `ced/${stateId}.geojson`);
      expect(existsSync(stePath), stePath).toBe(true);
      expect(existsSync(cedPath), cedPath).toBe(true);
      const ste = JSON.parse(readFileSync(stePath, "utf8")) as {
        features: Array<{ properties: { stateId: string } }>;
      };
      const ced = JSON.parse(readFileSync(cedPath, "utf8")) as {
        features: Array<{ properties: { stateId: string; cedId: string } }>;
      };
      expect(ste.features).toHaveLength(1);
      expect(ste.features[0]?.properties.stateId).toBe(stateId);
      expect(ced.features.length).toBeGreaterThan(0);
      for (const feature of ced.features) {
        expect(feature.properties.stateId).toBe(stateId);
        expect(feature.properties.cedId.length).toBeGreaterThan(0);
      }
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

  it("ships national CED with cedId, name, and stateId", () => {
    const path = resolve(root, "ced.geojson");
    expect(existsSync(path), path).toBe(true);
    const collection = JSON.parse(readFileSync(path, "utf8")) as {
      features: Array<{ properties: { cedId: string; name: string; stateId: string } }>;
    };
    expect(collection.features.length).toBeGreaterThan(0);
    const locked = new Set(AUSTRALIA_STATES);
    for (const feature of collection.features) {
      expect(typeof feature.properties.cedId).toBe("string");
      expect(feature.properties.cedId.length).toBeGreaterThan(0);
      expect(typeof feature.properties.name).toBe("string");
      expect(feature.properties.name.length).toBeGreaterThan(0);
      expect(locked.has(feature.properties.stateId as (typeof AUSTRALIA_STATES)[number])).toBe(
        true,
      );
    }
  });

  it("ships SED slices for every stateId including non-empty NSW", () => {
    for (const stateId of AUSTRALIA_STATES) {
      const path = resolve(root, `sed/${stateId}.geojson`);
      expect(existsSync(path), path).toBe(true);
      const collection = JSON.parse(readFileSync(path, "utf8")) as {
        features: Array<{ properties: { sedId: string; name: string; stateId: string } }>;
      };
      expect(collection.features.length, stateId).toBeGreaterThan(0);
      for (const feature of collection.features) {
        expect(feature.properties.stateId).toBe(stateId);
        expect(typeof feature.properties.sedId).toBe("string");
        expect(feature.properties.sedId.length).toBeGreaterThan(0);
        expect(typeof feature.properties.name).toBe("string");
        expect(feature.properties.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("ships national sed.geojson covering every locked stateId", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "sed.geojson"), "utf8")) as {
      features: Array<{ properties: { sedId: string; stateId: string } }>;
    };
    expect(collection.features.length).toBeGreaterThan(0);
    const seen = new Set(collection.features.map((f) => f.properties.stateId));
    for (const stateId of AUSTRALIA_STATES) {
      expect(seen.has(stateId), stateId).toBe(true);
    }
  });

  it("ships Wikidata-filled POI bundles for every pack point category", () => {
    // National AU WDQS fill (P17=Q408 + pack bbox). Empty after sanitize would be
    // allowed only when WDQS returns none; current fill has data in every category.
    for (const category of PACK_GEO_POINT_CATEGORIES) {
      const path = resolve(root, `poi/${category}.json`);
      expect(existsSync(path), path).toBe(true);
      const payload = JSON.parse(readFileSync(path, "utf8")) as {
        source: string;
        places: Array<{ id: string; name: string; lat: number; lng: number }>;
      };
      expect(payload.source, category).toBe("wikidata");
      expect(payload.places.length, category).toBeGreaterThan(0);
      expect(payload.places.every((place) => /^Q\d+$/.test(place.id))).toBe(true);
      expect(payload.places.every((place) => place.name.trim().length > 0)).toBe(true);
    }
  });

  it("ships per-state POI slices for every locked stateId (NSW museum/park non-empty)", () => {
    for (const stateId of AUSTRALIA_STATES) {
      for (const category of PACK_GEO_POINT_CATEGORIES) {
        const path = resolve(root, `poi/${stateId}/${category}.json`);
        expect(existsSync(path), path).toBe(true);
        const payload = JSON.parse(readFileSync(path, "utf8")) as {
          source: string;
          places: unknown[];
        };
        expect(typeof payload.source).toBe("string");
        expect(Array.isArray(payload.places)).toBe(true);
      }
    }
    const nswMuseum = JSON.parse(readFileSync(resolve(root, "poi/nsw/museum.json"), "utf8")) as {
      places: unknown[];
    };
    const nswPark = JSON.parse(readFileSync(resolve(root, "poi/nsw/park.json"), "utf8")) as {
      places: unknown[];
    };
    expect(nswMuseum.places.length).toBeGreaterThan(0);
    expect(nswPark.places.length).toBeGreaterThan(0);
  });

  it("ships dense complete Open-Meteo sea_level_seed", () => {
    const seaLevel = JSON.parse(readFileSync(resolve(root, "sea_level_seed.json"), "utf8")) as {
      source: string;
      divisions: number;
      cells: unknown[];
      cellElevations: unknown[];
      complete?: boolean;
    };
    expect(seaLevel.source).toBe("open-meteo");
    expect(seaLevel.divisions).toBeGreaterThanOrEqual(PACK_SEA_LEVEL_SEED_DIVISIONS);
    expect(seaLevel.complete).toBe(true);
    expect(seaLevel.cells.length).toBeGreaterThan(0);
    expect(seaLevel.cellElevations.length).toBe(seaLevel.cells.length);
  });

  it("records Wikidata and Open-Meteo in ATTRIBUTION", () => {
    const text = readFileSync(resolve(root, "ATTRIBUTION.txt"), "utf8");
    expect(text).toMatch(/Wikidata/i);
    expect(text).toMatch(/Open-Meteo/i);
  });
});
