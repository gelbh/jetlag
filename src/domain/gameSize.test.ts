import { describe, expect, it } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";
import {
  gameAreaSquareMiles,
  recommendGameSize,
  hidingZoneRadiusMeters,
} from "./gameSize";
import { milesToMeters } from "./distance";

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

  it("maps hiding zone radius by game size", () => {
    expect(hidingZoneRadiusMeters("small")).toBeCloseTo(milesToMeters(0.25));
    expect(hidingZoneRadiusMeters("medium")).toBeCloseTo(milesToMeters(0.25));
    expect(hidingZoneRadiusMeters("large")).toBeCloseTo(milesToMeters(0.5));
  });
});
