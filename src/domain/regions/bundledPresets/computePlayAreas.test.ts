import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import area from "@turf/area";
import { BUNDLED_PRESET_PLAY_AREA_SQ_MI } from "./playAreas";

const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;

function squareMilesFromCityGeoJson(relativePath: string): number {
  const collection = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, `../../../../public/geo/${relativePath}`),
      "utf8",
    ),
  );
  const feature = collection.features?.[0];
  if (!feature) {
    throw new Error(`Missing city feature in ${relativePath}`);
  }
  return area(feature) / SQ_METERS_PER_SQ_MILE;
}

describe("bundled preset play areas", () => {
  it("matches Prince Rupert city boundary square mileage", () => {
    const computed = squareMilesFromCityGeoJson("prince-rupert/city.geojson");
    const recorded = BUNDLED_PRESET_PLAY_AREA_SQ_MI["bundled:prince-rupert"];
    expect(recorded).toBeDefined();
    expect(recorded).toBeCloseTo(computed, 1);
  });
});
