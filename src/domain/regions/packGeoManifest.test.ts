import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_MEASURING_CATALOG } from "@/domain/questions";
import { REGION_PACK_IDS } from "./regionPack";
import {
  isPackGeoSupported,
  PACK_GEO_PACK_IDS,
  PACK_GEO_POINT_CATEGORIES,
  packGeoCoastlinePublicPath,
  packGeoCoastlineUrl,
  packGeoPoiPublicPath,
  packGeoPoiUrl,
  packGeoSeaLevelSeedPublicPath,
  packGeoSeaLevelSeedUrl,
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

  it("builds coastline and sea-level seed urls", () => {
    expect(packGeoCoastlineUrl("dublin")).toBe("/geo/dublin/coastline.json");
    expect(packGeoSeaLevelSeedUrl("tokyo")).toBe(
      "/geo/tokyo/sea_level_seed.json",
    );
  });

  it("has on-disk coastline and sea_level_seed json for every pack", () => {
    for (const packId of PACK_GEO_PACK_IDS) {
      const coastlinePath = resolve(
        publicRoot,
        packGeoCoastlinePublicPath(packId),
      );
      const seaLevelPath = resolve(
        publicRoot,
        packGeoSeaLevelSeedPublicPath(packId),
      );
      expect(existsSync(coastlinePath), coastlinePath).toBe(true);
      expect(existsSync(seaLevelPath), seaLevelPath).toBe(true);

      const coastline = JSON.parse(readFileSync(coastlinePath, "utf8")) as {
        source: string;
        segments: unknown[];
      };
      const seaLevel = JSON.parse(readFileSync(seaLevelPath, "utf8")) as {
        source: string;
        divisions: number;
        cells: unknown[];
        cellElevations: unknown[];
        complete?: boolean;
      };
      expect(typeof coastline.source).toBe("string");
      expect(Array.isArray(coastline.segments)).toBe(true);
      expect(typeof seaLevel.source).toBe("string");
      expect(typeof seaLevel.divisions).toBe("number");
      expect(Array.isArray(seaLevel.cells)).toBe(true);
      expect(Array.isArray(seaLevel.cellElevations)).toBe(true);
    }
  });

  it("ships dense complete sea_level_seed for london and tokyo", () => {
    for (const packId of ["london", "tokyo"] as const) {
      const seaLevelPath = resolve(
        publicRoot,
        packGeoSeaLevelSeedPublicPath(packId),
      );
      const seaLevel = JSON.parse(readFileSync(seaLevelPath, "utf8")) as {
        source: string;
        divisions: number;
        cells: unknown[];
        cellElevations: unknown[];
        complete?: boolean;
      };
      expect(seaLevel.source).toBe("open-meteo");
      expect(seaLevel.divisions).toBeGreaterThanOrEqual(20);
      expect(seaLevel.complete).toBe(true);
      expect(seaLevel.cells.length).toBeGreaterThan(0);
      expect(seaLevel.cellElevations.length).toBe(seaLevel.cells.length);
    }
  });
});
