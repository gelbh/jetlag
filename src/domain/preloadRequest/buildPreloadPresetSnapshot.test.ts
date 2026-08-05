import { describe, expect, it } from "vitest";
import { buildPreloadPresetSnapshot } from "./buildPreloadPresetSnapshot";

describe("buildPreloadPresetSnapshot", () => {
  it("returns null when the name is blank", () => {
    expect(
      buildPreloadPresetSnapshot({
        name: "   ",
        gameSize: "medium",
        distanceUnit: "metric",
      }),
    ).toBeNull();
  });

  it("omits full geometry and records gameAreaBytes", () => {
    const snapshot = buildPreloadPresetSnapshot({
      name: "Cork weekend",
      placeLabel: "Cork",
      gameSize: "medium",
      distanceUnit: "metric",
      focusBounds: { south: 1, west: 2, north: 3, east: 4 },
      gameArea: {
        type: "Polygon",
        coordinates: [
          [
            [2, 1],
            [4, 1],
            [4, 3],
            [2, 3],
            [2, 1],
          ],
        ],
      },
      presetId: "p1",
    });

    expect(snapshot).toEqual({
      name: "Cork weekend",
      placeLabel: "Cork",
      gameSize: "medium",
      distanceUnit: "metric",
      focusBounds: { south: 1, west: 2, north: 3, east: 4 },
      gameAreaBytes: expect.any(Number),
      presetId: "p1",
    });
    expect(snapshot && "coordinates" in snapshot).toBe(false);
    expect(snapshot?.gameAreaBytes).toBeGreaterThan(0);
  });
});
