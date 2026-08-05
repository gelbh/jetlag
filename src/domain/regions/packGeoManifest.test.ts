import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_MEASURING_CATALOG } from "@/domain/questions";
import { REGION_PACK_IDS } from "./regionPack";
import {
  isPackGeoSupported,
  PACK_GEO_PACK_IDS,
  PACK_GEO_POINT_CATEGORIES,
  packGeoPoiPublicPath,
  packGeoPoiUrl,
} from "./packGeoManifest";

const publicRoot = resolve(import.meta.dirname, "../../../public");

describe("packGeoManifest", () => {
  it("lists every RegionPackId", () => {
    expect([...PACK_GEO_PACK_IDS].sort()).toEqual([...REGION_PACK_IDS].sort());
  });

  it("includes every measuring point category with overpassSelectors (excl custom)", () => {
    const expected = BASE_MEASURING_CATALOG.filter(
      (option) =>
        option.targetKind === "point" && option.overpassSelectors.length > 0,
    ).map((option) => option.id);

    expect([...PACK_GEO_POINT_CATEGORIES].sort()).toEqual(
      [...expected].sort(),
    );
    expect(PACK_GEO_POINT_CATEGORIES).not.toContain("custom_place");
  });

  it("builds poi urls and supports pack×category matrix", () => {
    expect(packGeoPoiUrl("nyc", "zoo")).toBe("/geo/nyc/poi/zoo.json");
    expect(isPackGeoSupported("tokyo", "poi", "museum")).toBe(true);
    expect(isPackGeoSupported("tokyo", "poi", "custom_place")).toBe(false);
    expect(isPackGeoSupported("tokyo", "coastline")).toBe(true);
    expect(isPackGeoSupported("tokyo", "coastline", "museum")).toBe(false);
  });

  it("has on-disk poi json for every pack × point category", () => {
    for (const packId of PACK_GEO_PACK_IDS) {
      for (const category of PACK_GEO_POINT_CATEGORIES) {
        const relative = packGeoPoiPublicPath(packId, category);
        const absolute = resolve(publicRoot, relative);
        expect(existsSync(absolute), absolute).toBe(true);

        const payload = JSON.parse(readFileSync(absolute, "utf8")) as {
          category: string;
          source: string;
          places: unknown[];
        };
        expect(payload.category).toBe(category);
        expect(typeof payload.source).toBe("string");
        expect(Array.isArray(payload.places)).toBe(true);
      }
    }
  });
});
