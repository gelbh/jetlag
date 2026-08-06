import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import {
  PACK_ATTACH_MIN_INTERSECTION_KM2,
  PACK_ATTACH_MIN_INTERSECTION_RATIO,
  suggestRegionPackForGameArea,
} from "./packAttach";
import { REGION_PACK_REFERENCE_BBOXES } from "./packGeoManifest";

/** Axis-aligned polygon from south/west/north/east (lng, lat rings). */
function boxPolygon(
  south: number,
  west: number,
  north: number,
  east: number,
): GameArea {
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

describe("suggestRegionPackForGameArea", () => {
  it("suggests nyc for a NY-state-sized polygon covering the NYC pack", () => {
    // Rough NY state box that fully covers the NYC pack bbox.
    const nyState = boxPolygon(40.4, -79.8, 45.0, -71.8);
    const suggestion = suggestRegionPackForGameArea(nyState);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.packId).toBe("nyc");
    expect(suggestion!.score).toBeGreaterThan(0);
  });

  it("suggests dublin for a Dublin-city-sized polygon", () => {
    const suggestion = suggestRegionPackForGameArea(DUBLIN_CITY_GAME_AREA);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.packId).toBe("dublin");
  });

  it("returns null for a mid-Atlantic ocean polygon", () => {
    const midAtlantic = boxPolygon(35, -40, 45, -30);
    expect(suggestRegionPackForGameArea(midAtlantic)).toBeNull();
  });

  it("picks the higher-scoring pack when zurich and lucerne both overlap", () => {
    const overlap = REGION_PACK_REFERENCE_BBOXES.zurich;
    const lucerne = REGION_PACK_REFERENCE_BBOXES.lucerne;
    // Game area = zurich∩lucerne overlap rectangle.
    const south = Math.max(overlap.south, lucerne.south);
    const west = Math.max(overlap.west, lucerne.west);
    const north = Math.min(overlap.north, lucerne.north);
    const east = Math.min(overlap.east, lucerne.east);
    expect(south).toBeLessThan(north);
    expect(west).toBeLessThan(east);

    const suggestion = suggestRegionPackForGameArea(
      boxPolygon(south, west, north, east),
    );
    expect(suggestion).not.toBeNull();

    // Score = intersection / pack area; same intersection ⇒ smaller pack wins.
    const zurichArea =
      (REGION_PACK_REFERENCE_BBOXES.zurich.north -
        REGION_PACK_REFERENCE_BBOXES.zurich.south) *
      (REGION_PACK_REFERENCE_BBOXES.zurich.east -
        REGION_PACK_REFERENCE_BBOXES.zurich.west);
    const lucerneArea =
      (REGION_PACK_REFERENCE_BBOXES.lucerne.north -
        REGION_PACK_REFERENCE_BBOXES.lucerne.south) *
      (REGION_PACK_REFERENCE_BBOXES.lucerne.east -
        REGION_PACK_REFERENCE_BBOXES.lucerne.west);
    const expectedWinner =
      zurichArea <= lucerneArea ? "zurich" : "lucerne";
    expect(suggestion!.packId).toBe(expectedWinner);
  });

  it("returns null when intersection is below max(α×packArea, β km²)", () => {
    const nyc = REGION_PACK_REFERENCE_BBOXES.nyc;
    // Tiny sliver along the southern edge — well below default α and β.
    const tiny = boxPolygon(
      nyc.south - 0.002,
      nyc.west,
      nyc.south + 0.00005,
      nyc.west + 0.00005,
    );
    expect(
      suggestRegionPackForGameArea(tiny, {
        minIntersectionRatio: PACK_ATTACH_MIN_INTERSECTION_RATIO,
        minIntersectionKm2: PACK_ATTACH_MIN_INTERSECTION_KM2,
      }),
    ).toBeNull();
  });
});
