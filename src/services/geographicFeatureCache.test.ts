import { describe, expect, it } from "vitest";
import type { GameArea } from "../domain/annotations";
import {
  adminDivisionCacheKey,
  coastlineSegmentsCacheKey,
  geographicCacheKey,
  landmassCacheKey,
  staticTransitCacheKey,
} from "./geographicFeatureCache";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

describe("geographicFeatureCache TTL tiers", () => {
  it("uses stable cache key prefixes for long-lived layers", () => {
    expect(adminDivisionCacheKey(sampleGameArea, 6)).toMatch(/^admin:6:/);
    expect(landmassCacheKey(sampleGameArea)).toMatch(/^landmass:/);
    expect(coastlineSegmentsCacheKey(sampleGameArea)).toMatch(/^coastline:/);
    expect(staticTransitCacheKey(sampleGameArea)).toMatch(/^transit:static:/);
    expect(geographicCacheKey(sampleGameArea, "measuring:park")).toMatch(
      /^measuring:park:/,
    );
  });
});
