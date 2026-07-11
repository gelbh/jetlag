import { describe, expect, it } from "vitest";
import {
  gameSizeRulesSummary,
  hidingPeriodMinutes,
  isRadarPresetAvailableForGameSize,
  isThermometerPresetAvailableForGameSize,
  isTentacleCategoryAvailableForGameSize,
  radarPresetsMilesForGameSize,
  tentacleEnabledForGameSize,
  tentacleOptionsForGameSize,
  thermometerPresetsMilesForGameSize,
  toolDockEnabled,
} from "./gameSizeRules";
import { milesToMeters } from "../map/distance";

describe("gameSizeRules", () => {
  it("maps hiding period by game size", () => {
    expect(hidingPeriodMinutes("small")).toBe(30);
    expect(hidingPeriodMinutes("medium")).toBe(60);
    expect(hidingPeriodMinutes("large")).toBe(180);
  });

  it("gates radar presets by game size", () => {
    expect(radarPresetsMilesForGameSize("small")).toEqual([0.25, 0.5, 1, 3, 5]);
    expect(radarPresetsMilesForGameSize("medium")).toEqual([
      0.25, 0.5, 1, 3, 5, 10, 25,
    ]);
    expect(radarPresetsMilesForGameSize("large")).toEqual([
      0.25, 0.5, 1, 3, 5, 10, 25, 50, 100,
    ]);
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

  it("requires hiders for photo tool in dock", () => {
    expect(toolDockEnabled("photo", "medium")).toBe(false);
    expect(toolDockEnabled("photo", "medium", { hasHiders: false })).toBe(false);
    expect(toolDockEnabled("photo", "medium", { hasHiders: true })).toBe(true);
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

  it("checks radar preset availability", () => {
    expect(
      isRadarPresetAvailableForGameSize("small", milesToMeters(5)),
    ).toBe(true);
    expect(
      isRadarPresetAvailableForGameSize("small", milesToMeters(50)),
    ).toBe(false);
  });

  it("checks thermometer preset availability", () => {
    expect(
      isThermometerPresetAvailableForGameSize("small", milesToMeters(0.5)),
    ).toBe(true);
    expect(
      isThermometerPresetAvailableForGameSize("small", milesToMeters(50)),
    ).toBe(false);
  });

  it("checks tentacle category availability", () => {
    expect(isTentacleCategoryAvailableForGameSize("medium", "museum")).toBe(
      true,
    );
    expect(isTentacleCategoryAvailableForGameSize("small", "museum")).toBe(
      false,
    );
  });

  it("summarizes rules for UI labels", () => {
    expect(gameSizeRulesSummary("small").hidingPeriodLabel).toBe(
      "30 min hiding period",
    );
    expect(gameSizeRulesSummary("large").tentacleLabel).toBe(
      "Tentacles @ 1 mi and 15 mi",
    );
  });
});
