import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import type { GameArea } from "@/domain/map/annotations";
import { parseMatchingAreaGeoJson } from "./matchingAreaGeoJson";

const ROOT = resolve(import.meta.dirname, "../../../..");

describe("Dublin bundled GeoJSON", () => {
  it("parses council and LEA assets for the Dublin play area", () => {
    const councils = readFileSync(
      resolve(ROOT, "public/geo/dublin/councils.geojson"),
      "utf8",
    );
    const leas = readFileSync(
      resolve(ROOT, "public/geo/dublin/leas.geojson"),
      "utf8",
    );

    const councilDivisions = parseMatchingAreaGeoJson(
      councils,
      DUBLIN_CITY_GAME_AREA,
      8,
    );
    const leaDivisions = parseMatchingAreaGeoJson(
      leas,
      DUBLIN_CITY_GAME_AREA,
      9,
    );

    expect(councilDivisions.length).toBeGreaterThanOrEqual(2);
    expect(leaDivisions.length).toBeGreaterThanOrEqual(2);
    expect(councilDivisions.some((item) => item.name.includes("Dublin"))).toBe(
      true,
    );
    expect(leaDivisions.some((item) => item.name.includes("Clontarf"))).toBe(
      true,
    );
  });

  it("keeps 51 named custom polygons intersecting the play area", () => {
    const playArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-1, -1],
          [60, -1],
          [60, 10],
          [-1, 10],
          [-1, -1],
        ],
      ],
    };
    const geojson = JSON.stringify({
      type: "FeatureCollection",
      features: Array.from({ length: 51 }, (_, i) => ({
        type: "Feature",
        properties: { name: `Area ${i}` },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [i, 0],
              [i + 0.4, 0],
              [i + 0.4, 0.4],
              [i, 0.4],
              [i, 0],
            ],
          ],
        },
      })),
    });
    expect(parseMatchingAreaGeoJson(geojson, playArea, 8)).toHaveLength(51);
  });
});
