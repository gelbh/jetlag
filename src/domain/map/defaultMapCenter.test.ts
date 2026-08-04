import { describe, expect, it } from "vitest";
import { gameAreaCenter } from "../geometry/core/gameAreaConvert";
import type { GameArea } from "./annotations";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_LNGLAT } from "./defaultMapCenter";

const DUBLIN_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

describe("defaultMapCenter", () => {
  it("keeps London fallback documented and MapLibre lng/lat order", () => {
    expect(DEFAULT_MAP_CENTER).toEqual([51.505, -0.09]);
    expect(DEFAULT_MAP_LNGLAT).toEqual([-0.09, 51.505]);
  });

  it("derives play-area center instead of leaking the London fallback", () => {
    const center = gameAreaCenter(DUBLIN_AREA);
    expect(center).not.toEqual(DEFAULT_MAP_CENTER);
    expect(center[0]).toBeCloseTo(53.35, 5);
    expect(center[1]).toBeCloseTo(-6.25, 5);
  });
});
