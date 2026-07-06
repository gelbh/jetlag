import { describe, expect, it } from "vitest";
import {
  hidingPeriodMinutes,
  tentacleEnabledForGameSize,
  tentacleOptionsForGameSize,
  thermometerPresetsMilesForGameSize,
  toolDockEnabled,
} from "./gameSizeRules";
import { milesToMeters } from "./distance";

describe("gameSizeRules", () => {
  it("maps hiding period by game size", () => {
    expect(hidingPeriodMinutes("small")).toBe(30);
    expect(hidingPeriodMinutes("medium")).toBe(60);
    expect(hidingPeriodMinutes("large")).toBe(180);
  });

  it("gates thermometer presets by game size", () => {
    expect(thermometerPresetsMilesForGameSize("small")).toEqual([0.5, 3]);
    expect(thermometerPresetsMilesForGameSize("medium")).toEqual([0.5, 3, 10]);
    expect(thermometerPresetsMilesForGameSize("large")).toEqual([
      0.5, 3, 10, 50,
    ]);
  });

  it("disables tentacles on small games", () => {
    expect(tentacleEnabledForGameSize("small")).toBe(false);
    expect(toolDockEnabled("tentacle", "small")).toBe(false);
    expect(tentacleOptionsForGameSize("small")).toEqual([]);
  });

  it("exposes medium tentacle categories at 1 mile", () => {
    const options = tentacleOptionsForGameSize("medium");
    expect(options).toHaveLength(4);
    expect(options.every((o) => o.radiusMeters === milesToMeters(1))).toBe(
      true,
    );
  });

  it("adds large tentacle categories at 15 miles", () => {
    const options = tentacleOptionsForGameSize("large");
    expect(options).toHaveLength(8);
    const metro = options.find((o) => o.categoryId === "metro_line");
    expect(metro?.radiusMeters).toBe(milesToMeters(15));
  });
});
