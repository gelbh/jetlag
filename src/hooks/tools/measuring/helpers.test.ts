import type { MeasuringPlace } from "../../../domain/geo/types";
import { describe, expect, it } from "vitest";
import { buildStoredMeasuringRegionInput } from "./helpers";

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
    const places: MeasuringPlace[] = [
      { id: "p1", name: "Park", point: [53.3, -6.2] },
    ];
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
