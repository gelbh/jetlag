import { describe, expect, it } from "vitest";
import { boundingBoxesIntersect, isValidBoundingBox } from "../geometry/gameArea/gameAreaBounds";
import { ESRI_REFERENCE_OVERLAY_TILE_URL, ESRI_WORLD_IMAGERY_TILE_URL } from "./mapBasemaps";
import { isTileInGameArea, parseTileXYZ, tileToBbox } from "./tileBbox";

function fillXyzTemplate(template: string, z: number, x: number, y: number): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

/** Real OpenFreeMap planet vector tile URL shape (from the liberty style tilejson). */
const OPENFREEMAP_TILE_URL =
  "https://tiles.openfreemap.org/planet/20250430_001001_pt/14/8186/5448.pbf";

const LONDON_BBOX = { south: 51.48, west: -0.15, north: 51.53, east: -0.08 };
const SYDNEY_BBOX = { south: -33.9, west: 151.15, north: -33.85, east: 151.25 };

describe("parseTileXYZ", () => {
  it("parses Esri World Imagery /tile/{z}/{y}/{x} (row before column)", () => {
    const url = fillXyzTemplate(ESRI_WORLD_IMAGERY_TILE_URL, 14, 8186, 5448);
    expect(url).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/5448/8186",
    );
    expect(parseTileXYZ(url)).toEqual({ z: 14, x: 8186, y: 5448 });
  });

  it("parses the Esri reference overlay host too", () => {
    const url = fillXyzTemplate(ESRI_REFERENCE_OVERLAY_TILE_URL, 3, 4, 2);
    expect(parseTileXYZ(url)).toEqual({ z: 3, x: 4, y: 2 });
  });

  it("parses OpenFreeMap /{z}/{x}/{y}.pbf", () => {
    expect(parseTileXYZ(OPENFREEMAP_TILE_URL)).toEqual({ z: 14, x: 8186, y: 5448 });
  });

  it("parses OpenFreeMap natural-earth raster tiles", () => {
    expect(parseTileXYZ("https://tiles.openfreemap.org/natural_earth/ne2sr/2/1/3.png")).toEqual({
      z: 2,
      x: 1,
      y: 3,
    });
  });

  it("ignores OpenFreeMap fonts, sprites, style JSON, and tilejson", () => {
    expect(
      parseTileXYZ("https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf"),
    ).toBeNull();
    expect(parseTileXYZ("https://tiles.openfreemap.org/sprites/ofm_f384/ofm@2x.png")).toBeNull();
    expect(parseTileXYZ("https://tiles.openfreemap.org/styles/liberty")).toBeNull();
    expect(parseTileXYZ("https://tiles.openfreemap.org/planet")).toBeNull();
  });

  it("rejects unknown hosts and out-of-range tiles", () => {
    expect(parseTileXYZ("https://tile.openstreetmap.org/14/8186/5448.png")).toBeNull();
    expect(parseTileXYZ("https://tiles.openfreemap.org/planet/v/1/2/0.pbf")).toBeNull();
    expect(parseTileXYZ("not a url")).toBeNull();
  });
});

describe("tileToBbox", () => {
  it("maps tile 0/0/0 to the whole Web Mercator world", () => {
    const bbox = tileToBbox(0, 0, 0);
    expect(bbox.west).toBe(-180);
    expect(bbox.east).toBe(180);
    expect(bbox.north).toBeCloseTo(85.0511, 3);
    expect(bbox.south).toBeCloseTo(-85.0511, 3);
  });

  it("puts z14 8186/5448 over central London", () => {
    const bbox = tileToBbox(14, 8186, 5448);
    expect(bbox.west).toBeLessThan(-0.12);
    expect(bbox.east).toBeGreaterThan(-0.12);
    expect(bbox.south).toBeLessThan(bbox.north);
    expect(boundingBoxesIntersect(bbox, LONDON_BBOX)).toBe(true);
  });
});

describe("boundingBoxesIntersect", () => {
  it("detects overlap, containment, and shared edges", () => {
    const a = { south: 0, west: 0, north: 10, east: 10 };
    expect(boundingBoxesIntersect(a, { south: 5, west: 5, north: 15, east: 15 })).toBe(true);
    expect(boundingBoxesIntersect(a, { south: 2, west: 2, north: 3, east: 3 })).toBe(true);
    expect(boundingBoxesIntersect(a, { south: 10, west: 0, north: 20, east: 10 })).toBe(true);
  });

  it("rejects disjoint boxes on either axis", () => {
    const a = { south: 0, west: 0, north: 10, east: 10 };
    expect(boundingBoxesIntersect(a, { south: 11, west: 0, north: 20, east: 10 })).toBe(false);
    expect(boundingBoxesIntersect(a, { south: 0, west: -20, north: 10, east: -1 })).toBe(false);
  });
});

describe("isTileInGameArea", () => {
  it("routes London tiles to the game area only when the bbox overlaps", () => {
    expect(isTileInGameArea(OPENFREEMAP_TILE_URL, LONDON_BBOX)).toBe(true);
    expect(isTileInGameArea(OPENFREEMAP_TILE_URL, SYDNEY_BBOX)).toBe(false);
    expect(isTileInGameArea(OPENFREEMAP_TILE_URL, null)).toBe(false);
  });

  it("never routes non-tile OpenFreeMap assets to the game area", () => {
    expect(isTileInGameArea("https://tiles.openfreemap.org/styles/liberty", LONDON_BBOX)).toBe(
      false,
    );
  });
});

describe("isValidBoundingBox", () => {
  it("accepts a finite in-range box", () => {
    expect(isValidBoundingBox(LONDON_BBOX)).toBe(true);
  });

  it("rejects malformed, inverted, or out-of-range boxes", () => {
    expect(isValidBoundingBox(null)).toBe(false);
    expect(isValidBoundingBox({ south: 0, west: 0, north: 1 })).toBe(false);
    expect(isValidBoundingBox({ south: "0", west: 0, north: 1, east: 1 })).toBe(false);
    expect(isValidBoundingBox({ south: Number.NaN, west: 0, north: 1, east: 1 })).toBe(false);
    expect(isValidBoundingBox({ south: 2, west: 0, north: 1, east: 1 })).toBe(false);
    expect(isValidBoundingBox({ south: 0, west: -181, north: 1, east: 1 })).toBe(false);
    expect(isValidBoundingBox({ south: -91, west: 0, north: 1, east: 1 })).toBe(false);
  });
});
