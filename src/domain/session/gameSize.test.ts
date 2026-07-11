import { describe, expect, it } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import {
  clampHidingZoneRadiusMeters,
  effectiveHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
  gameAreaSquareMiles,
  HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
  recommendGameSize,
  hidingZoneRadiusMeters,
} from "./gameSize";
import { milesToMeters } from "../map/distance";

describe("gameSize", () => {
  it("recommends small for compact play areas", () => {
    const compact = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-6.27, 53.34],
          [-6.25, 53.34],
          [-6.25, 53.35],
          [-6.27, 53.35],
          [-6.27, 53.34],
        ],
      ],
    };

    expect(recommendGameSize(compact)).toBe("small");
    expect(gameAreaSquareMiles(compact)).toBeLessThan(100);
  });

  it("recommends medium for city-scale areas", () => {
    expect(recommendGameSize(DUBLIN_CITY_GAME_AREA)).toBe("medium");
  });

  it("sums all polygons in a MultiPolygon play area", () => {
    const splitCounty = {
      type: "MultiPolygon" as const,
      coordinates: [
        [
          [
            [-6.45, 53.27],
            [-6.25, 53.27],
            [-6.25, 53.35],
            [-6.45, 53.35],
            [-6.45, 53.27],
          ],
        ],
        [
          [
            [-6.24, 53.27],
            [-6.08, 53.27],
            [-6.08, 53.35],
            [-6.24, 53.35],
            [-6.24, 53.27],
          ],
        ],
      ],
    };

    expect(gameAreaSquareMiles(splitCounty)).toBeGreaterThan(50);
  });

  it("maps hiding zone radius by game size", () => {
    expect(hidingZoneRadiusMeters("small")).toBeCloseTo(milesToMeters(0.25));
    expect(hidingZoneRadiusMeters("medium")).toBeCloseTo(milesToMeters(0.25));
    expect(hidingZoneRadiusMeters("large")).toBeCloseTo(milesToMeters(0.5));
  });

  it("uses session override for effective hiding zone radius", () => {
    expect(
      effectiveHidingZoneRadiusMeters({
        gameSize: "medium",
        hidingZoneRadiusMeters: HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
      }),
    ).toBe(250);
  });

  it("clamps custom hiding zone radius", () => {
    expect(clampHidingZoneRadiusMeters(50)).toBe(100);
    expect(clampHidingZoneRadiusMeters(900)).toBe(800);
  });

  it("formats custom hiding zone radius labels", () => {
    expect(formatHidingZoneRadiusLabel(250, "metric")).toBe("250 m");
    expect(formatHidingZoneRadiusLabel(milesToMeters(0.25))).toBe("¼ mile");
  });
});
