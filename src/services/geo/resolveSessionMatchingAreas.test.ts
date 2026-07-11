import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearResolvedMatchingAreasCacheForTests,
  matchingAreasCacheKey,
  resolveSessionMatchingAreas,
} from "./resolveSessionMatchingAreas";
import * as regionPackBoundaries from "./regionPackBoundaries";

vi.mock("./regionPackBoundaries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./regionPackBoundaries")>();
  return {
    ...actual,
    loadRegionPackMatchingAreas: vi.fn(actual.loadRegionPackMatchingAreas),
  };
});

const bundledAreas = {
  8: '{"type":"FeatureCollection","features":[]}',
  9: '{"type":"FeatureCollection","features":[]}',
};

describe("resolveSessionMatchingAreas", () => {
  beforeEach(() => {
    clearResolvedMatchingAreasCacheForTests();
    vi.restoreAllMocks();
  });

  it("returns session custom matching areas when levels 8 and 9 are present", async () => {
    const sessionAreas = {
      8: "session-primary",
      9: "session-secondary",
    };

    const areas = await resolveSessionMatchingAreas({
      regionPackId: "dublin",
      regionPackSubregionId: "south-dublin",
      customMatchingAreas: sessionAreas,
    });

    expect(areas).toEqual(sessionAreas);
    expect(regionPackBoundaries.loadRegionPackMatchingAreas).not.toHaveBeenCalled();
  });

  it("loads bundled matching areas from the region pack when session areas are missing", async () => {
    vi.spyOn(
      regionPackBoundaries,
      "loadRegionPackMatchingAreas",
    ).mockResolvedValue(bundledAreas);

    const areas = await resolveSessionMatchingAreas({
      regionPackId: "dublin",
      regionPackSubregionId: "south-dublin",
    });

    expect(areas).toEqual(bundledAreas);
    expect(regionPackBoundaries.loadRegionPackMatchingAreas).toHaveBeenCalledWith(
      "dublin",
      "south-dublin",
    );
  });

  it("reuses cached bundled matching areas for the same pack and subregion", async () => {
    vi.spyOn(
      regionPackBoundaries,
      "loadRegionPackMatchingAreas",
    ).mockResolvedValue(bundledAreas);

    const input = {
      regionPackId: "london" as const,
      regionPackSubregionId: "camden",
    };

    const first = await resolveSessionMatchingAreas(input);
    const second = await resolveSessionMatchingAreas(input);

    expect(first).toBe(second);
    expect(
      matchingAreasCacheKey("london", "camden", false),
    ).toBe("london:camden:");
  });
});
