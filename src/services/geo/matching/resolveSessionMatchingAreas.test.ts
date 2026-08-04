import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION } from "@/domain/regions/regionPack";
import { createTestSession } from "@/test/fixtures/sessions";
import {
  clearResolvedMatchingAreasCacheForTests,
  isPlayAreaReadySync,
  matchingAreasCacheKey,
  peekResolvedPlayArea,
  resolveSessionMatchingAreas,
  resolveSessionPlayArea,
} from "./resolveSessionMatchingAreas";
import * as regionPackBoundaries from "./regionPackBoundaries";

vi.mock("./regionPackBoundaries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./regionPackBoundaries")>();
  return {
    ...actual,
    loadRegionPackMatchingAreas: vi.fn(actual.loadRegionPackMatchingAreas),
    loadRegionPackPlayArea: vi.fn(actual.loadRegionPackPlayArea),
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

  it("returns session custom matching areas when levels 8 and 9 are present and revision matches", async () => {
    const sessionAreas = {
      8: "session-primary",
      9: "session-secondary",
    };

    const areas = await resolveSessionMatchingAreas({
      regionPackId: "dublin",
      regionPackSubregionId: "south-dublin",
      customMatchingAreas: sessionAreas,
      bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
    });

    expect(areas).toEqual(sessionAreas);
    expect(regionPackBoundaries.loadRegionPackMatchingAreas).not.toHaveBeenCalled();
  });

  it("reloads bundled matching areas when session revision is stale", async () => {
    vi.spyOn(
      regionPackBoundaries,
      "loadRegionPackMatchingAreas",
    ).mockResolvedValue(bundledAreas);

    const sessionAreas = {
      8: "stale-primary",
      9: "stale-secondary",
    };

    const areas = await resolveSessionMatchingAreas({
      regionPackId: "dublin",
      regionPackSubregionId: "south-dublin",
      customMatchingAreas: sessionAreas,
      bundledGeoRevision: 1,
    });

    expect(areas).toEqual(bundledAreas);
    expect(regionPackBoundaries.loadRegionPackMatchingAreas).toHaveBeenCalledWith(
      "dublin",
      "south-dublin",
    );
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
    ).toBe(`${BUNDLED_REGION_PACK_GEO_REVISION}:london:camden:`);
  });
});

describe("resolveSessionPlayArea", () => {
  beforeEach(() => {
    clearResolvedMatchingAreasCacheForTests();
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockReset();
  });

  it("peekResolvedPlayArea is undefined before resolve and defined after", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    const loadedArea = { ...session.gameArea } as GameArea;

    expect(peekResolvedPlayArea(session)).toBeUndefined();

    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockResolvedValue(
      loadedArea,
    );
    await resolveSessionPlayArea(session);

    expect(peekResolvedPlayArea(session)).toBe(loadedArea);
  });

  it("coalesces concurrent resolveSessionPlayArea loads", async () => {
    let release!: (area: GameArea) => void;
    const delayed = new Promise<GameArea>((resolve) => {
      release = resolve;
    });
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockReturnValue(
      delayed,
    );

    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });

    const p1 = resolveSessionPlayArea(session);
    const p2 = resolveSessionPlayArea(session);
    expect(regionPackBoundaries.loadRegionPackPlayArea).toHaveBeenCalledTimes(1);

    release(session.gameArea);
    await expect(p1).resolves.toBe(session.gameArea);
    await expect(p2).resolves.toBe(session.gameArea);
  });

  it("marks ready on load reject without caching session.gameArea", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });

    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockRejectedValue(
      new Error("pack load failed"),
    );

    await expect(resolveSessionPlayArea(session)).resolves.toBe(session.gameArea);
    expect(isPlayAreaReadySync(session)).toBe(true);
    expect(peekResolvedPlayArea(session)).toBeUndefined();
  });
});
