import { describe, expect, it } from "vitest";
import { DEFAULT_RADIUS_METERS } from "./distance";
import { pointToolRadiusFromMetadata } from "./annotations";

describe("pointToolRadiusFromMetadata", () => {
  it("prefers radiusMeters when set", () => {
    expect(
      pointToolRadiusFromMetadata({
        radiusMeters: 24_140,
        tentacleAnswerRadiusMeters: 1_609,
      }),
    ).toBe(24_140);
  });

  it("falls back to tentacleAnswerRadiusMeters", () => {
    expect(
      pointToolRadiusFromMetadata({
        tentacleAnswerRadiusMeters: 24_140,
      }),
    ).toBe(24_140);
  });

  it("uses default when metadata is missing", () => {
    expect(pointToolRadiusFromMetadata({})).toBe(DEFAULT_RADIUS_METERS);
  });
});
