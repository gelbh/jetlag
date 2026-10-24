import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import area from "@turf/area";
import { describe, expect, it } from "vitest";
import { BUNDLED_PRESET_PLAY_AREA_SQ_MI } from "./playAreas";

const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;

function squareMilesFromCityGeoJson(relativePath: string): number {
  const collection = JSON.parse(
    readFileSync(resolve(import.meta.dirname, `../../../../public/geo/${relativePath}`), "utf8"),
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

  it("matches Southampton city boundary square mileage", () => {
    const computed = squareMilesFromCityGeoJson("southampton/city.geojson");
    const recorded = BUNDLED_PRESET_PLAY_AREA_SQ_MI["bundled:southampton"];
    expect(recorded).toBeDefined();
    expect(recorded).toBeCloseTo(computed, 1);
  });

  it("matches Sydney playArea.geojson square mileage", () => {
    const computed = squareMilesFromCityGeoJson("sydney/playArea.geojson");
    const recorded = BUNDLED_PRESET_PLAY_AREA_SQ_MI["bundled:sydney"];
    expect(recorded).toBeDefined();
    expect(recorded).toBeCloseTo(computed, 1);
  });

  it("matches Australia states.geojson square mileage", () => {
    const collection = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../../public/geo/australia/states.geojson"),
        "utf8",
      ),
    );
    let total = 0;
    for (const feature of collection.features ?? []) {
      const stateId = feature.properties?.stateId as string;
      const computed = area(feature) / SQ_METERS_PER_SQ_MILE;
      total += computed;
      const recorded = BUNDLED_PRESET_PLAY_AREA_SQ_MI[`bundled:australia-${stateId}`];
      expect(recorded, stateId).toBeDefined();
      expect(recorded).toBeCloseTo(computed, 1);
    }
    expect(BUNDLED_PRESET_PLAY_AREA_SQ_MI["bundled:australia"]).toBeCloseTo(total, 1);
  });
});
