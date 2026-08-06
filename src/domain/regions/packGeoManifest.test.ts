import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import { BASE_MEASURING_CATALOG } from "@/domain/questions";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";
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
  REGION_PACK_REFERENCE_BBOXES,
} from "./packGeoManifest";

const publicRoot = resolve(import.meta.dirname, "../../../public");

function bboxContains(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    outer.south <= inner.south &&
    outer.west <= inner.west &&
    outer.north >= inner.north &&
    outer.east >= inner.east
  );
}

function isPoiBbox(value: unknown): value is BoundingBox {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const box = value as Record<string, unknown>;
  return (
    typeof box.south === "number" &&
    typeof box.west === "number" &&
    typeof box.north === "number" &&
    typeof box.east === "number"
  );
}

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

  it("has a reference bbox for every RegionPackId", () => {
    for (const packId of REGION_PACK_IDS) {
      const box = REGION_PACK_REFERENCE_BBOXES[packId];
      expect(box).toBeDefined();
      expect(box.south).toBeLessThan(box.north);
      expect(box.west).toBeLessThan(box.east);
    }
    expect(Object.keys(REGION_PACK_REFERENCE_BBOXES).sort()).toEqual(
      [...REGION_PACK_IDS].sort(),
    );
  });

  it("reference bbox contains each POI file bbox when present", () => {
    for (const packId of REGION_PACK_IDS) {
      const poiDir = resolve(publicRoot, `geo/${packId}/poi`);
      if (!existsSync(poiDir)) {
        continue;
      }

      const ref = REGION_PACK_REFERENCE_BBOXES[packId as RegionPackId];

      for (const fileName of readdirSync(poiDir)) {
        if (!fileName.endsWith(".json")) {
          continue;
        }
        const payload = JSON.parse(
          readFileSync(resolve(poiDir, fileName), "utf8"),
        ) as { bbox?: unknown };
        // Skip files without bbox (tokyo/osaka/zurich/lucerne stubs).
        if (!isPoiBbox(payload.bbox)) {
          continue;
        }
        expect(
          bboxContains(ref, payload.bbox),
          `${packId}/${fileName} POI bbox not contained by reference`,
        ).toBe(true);
      }
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
