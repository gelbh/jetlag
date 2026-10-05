import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import { SWISS_CANTON_IDS } from "./bundledPresets/swiss";
import { isRegionPackId, REGION_PACK_IDS } from "./regionPack";
import { regionPackDisplayLabel } from "./regionPackDisplayLabel";
import { getRegionPackConfig } from "./regionPackRegistry";

const root = resolve(import.meta.dirname, "../../../public/geo/switzerland");

type CantonFeature = {
  properties: { cantonId: string };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

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
    expect(ids).toEqual([...SWISS_CANTON_IDS].sort());
  });

  it("ships municipality slices for every cantonId", () => {
    for (const cantonId of SWISS_CANTON_IDS) {
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

  it("keeps known cities inside the expected canton after PROJ reproject", () => {
    const collection = JSON.parse(readFileSync(resolve(root, "cantons.geojson"), "utf8")) as {
      features: CantonFeature[];
    };
    const byId = new Map(collection.features.map((f) => [f.properties.cantonId, f]));
    const controls: Array<{ cantonId: string; lon: number; lat: number }> = [
      { cantonId: "zurich", lon: 8.5402, lat: 47.3782 },
      { cantonId: "bern", lon: 7.4474, lat: 46.948 },
      { cantonId: "geneva", lon: 6.1432, lat: 46.2044 },
      { cantonId: "ticino", lon: 8.9511, lat: 46.0037 },
    ];
    for (const control of controls) {
      const feature = byId.get(control.cantonId);
      expect(feature, control.cantonId).toBeDefined();
      expect(
        booleanPointInPolygon(turfPoint([control.lon, control.lat]), feature!.geometry),
        control.cantonId,
      ).toBe(true);
      for (const other of collection.features) {
        if (other.properties.cantonId === control.cantonId) continue;
        expect(
          booleanPointInPolygon(turfPoint([control.lon, control.lat]), other.geometry),
          `${control.cantonId} not in ${other.properties.cantonId}`,
        ).toBe(false);
      }
    }
  });

  it("records PROJ CRS method in ATTRIBUTION", () => {
    const text = readFileSync(resolve(root, "ATTRIBUTION.txt"), "utf8");
    expect(text).toMatch(/EPSG:2056/);
    expect(text).toMatch(/EPSG:4326/);
    expect(text.toLowerCase()).toMatch(/pyproj|proj/);
  });
});
