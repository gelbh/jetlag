import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { matchingFeaturesCacheKey } from "./query";

const AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-74.01, 40.74],
      [-73.97, 40.74],
      [-73.97, 40.76],
      [-74.01, 40.76],
      [-74.01, 40.74],
    ],
  ],
};

describe("matchingFeaturesCacheKey", () => {
  it("includes effective metro and station filter", () => {
    const base = matchingFeaturesCacheKey(AREA, "transit_line");
    const filtered = matchingFeaturesCacheKey(AREA, "transit_line", {
      transitMetroId: "sydney",
      transitStationFilter: ["tram"],
    });
    expect(base).toContain("metro:auto");
    expect(base).toContain("filter:all");
    expect(filtered).toContain("metro:sydney");
    expect(filtered).toContain("filter:tram");
    expect(filtered).not.toBe(base);
  });
});
