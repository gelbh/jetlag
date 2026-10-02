import { describe, expect, it } from "vitest";
import type { MeasuringPlace } from "@/domain/geo/types";
import {
  buildStoredMeasuringRegionInput,
  measuringCommitReady,
  usesDebouncedSeekerResolve,
} from "./helpers";

describe("measuringCommitReady", () => {
  it("disarms coastline commit while loading or without segments", () => {
    expect(
      measuringCommitReady({
        measuringSubject: "coastline",
        measuringLoading: false,
        resolvedCoastSegmentsLength: 0,
      }),
    ).toBe(false);
    expect(
      measuringCommitReady({
        measuringSubject: "coastline",
        measuringLoading: true,
        resolvedCoastSegmentsLength: 2,
      }),
    ).toBe(false);
    expect(
      measuringCommitReady({
        measuringSubject: "coastline",
        measuringLoading: false,
        resolvedCoastSegmentsLength: 2,
      }),
    ).toBe(true);
  });

  it("disarms any subject while loading and ignores coastline segment count otherwise", () => {
    expect(
      measuringCommitReady({
        measuringSubject: "location",
        measuringLoading: true,
        resolvedCoastSegmentsLength: 0,
      }),
    ).toBe(false);
    expect(
      measuringCommitReady({
        measuringSubject: "sea_level",
        measuringLoading: false,
        resolvedCoastSegmentsLength: 0,
      }),
    ).toBe(true);
  });
});

describe("usesDebouncedSeekerResolve", () => {
  it("auto-resolves linear measures like coastline and all-places", () => {
    expect(usesDebouncedSeekerResolve("coastline", "coastline")).toBe(true);
    expect(usesDebouncedSeekerResolve("sea_level", "sea_level")).toBe(true);
    expect(usesDebouncedSeekerResolve("location", "museum")).toBe(true);
    expect(usesDebouncedSeekerResolve("location", "high_speed_rail_line")).toBe(true);
    expect(usesDebouncedSeekerResolve("location", "custom_place")).toBe(false);
  });
});

describe("buildStoredMeasuringRegionInput", () => {
  it("omits gameArea and clears duplicated all-places list", () => {
    const places: MeasuringPlace[] = [
      { id: "p1", name: "Park", point: [53.3, -6.2] },
      { id: "p2", name: "Park 2", point: [53.31, -6.21] },
    ];
    const stored = buildStoredMeasuringRegionInput({
      measuringSubject: "location",
      measuringLocationCategory: "park",
      measuringDistanceMeters: 900,
      measuringTargetPoint: null,
      measuringPlaces: places,
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      usesAllPlacesInArea: true,
    });

    expect(stored).not.toHaveProperty("gameArea");
    expect(stored.measuringPlaces).toEqual([]);
    expect(stored.usesAllPlacesInArea).toBe(true);
  });

  it("keeps a single-place target list when not using all places", () => {
    const places: MeasuringPlace[] = [{ id: "p1", name: "Park", point: [53.3, -6.2] }];
    const stored = buildStoredMeasuringRegionInput({
      measuringSubject: "location",
      measuringLocationCategory: "park",
      measuringDistanceMeters: 500,
      measuringTargetPoint: [53.3, -6.2],
      measuringPlaces: places,
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      usesAllPlacesInArea: false,
    });

    expect(stored.measuringPlaces).toEqual(places);
  });
});
