import { describe, expect, it } from "vitest";
import {
  defaultRadarPresetMeters,
  hidingZoneDefaultRadiusMeters,
  METRIC_RADAR_PRESET_METERS,
  METRIC_THERMOMETER_PRESET_METERS,
  radarPresetsMetersForGameSizeAndUnit,
  radarPresetMetersForUnit,
  thermometerPresetsMetersForGameSizeAndUnit,
} from "./distancePresets";
import { milesToMeters } from "./distance";
import {
  createSessionDraftToGamePreset,
  gamePresetToCreateSessionDraft,
} from "../session/presets/gamePreset";
import { defaultAdvancedSessionSettings } from "../session/tools/advancedSessionSettings";

describe("distancePresets", () => {
  it("uses native metric radar presets", () => {
    expect(radarPresetMetersForUnit("metric")).toEqual(METRIC_RADAR_PRESET_METERS);
    expect(defaultRadarPresetMeters("metric")).toBe(1000);
  });

  it("uses metric hiding zone radii", () => {
    expect(hidingZoneDefaultRadiusMeters("small", "metric")).toBe(500);
    expect(hidingZoneDefaultRadiusMeters("medium", "metric")).toBe(500);
    expect(hidingZoneDefaultRadiusMeters("large", "metric")).toBe(1000);
  });

  it("uses rulebook metric radar and thermometer ladders", () => {
    expect(METRIC_RADAR_PRESET_METERS).toEqual([
      500, 1000, 2000, 5000, 10_000, 15_000, 40_000, 80_000, 160_000,
    ]);
    expect(METRIC_RADAR_PRESET_METERS).toHaveLength(9);
    expect(METRIC_RADAR_PRESET_METERS.at(-1)).toBe(160_000);
    expect(METRIC_THERMOMETER_PRESET_METERS).toEqual([
      1000, 5000, 15_000, 75_000,
    ]);
  });

  it("gates radar presets by game size", () => {
    expect(radarPresetsMetersForGameSizeAndUnit("small", "metric")).toEqual([
      500, 1000, 2000, 5000, 10_000,
    ]);
    expect(radarPresetsMetersForGameSizeAndUnit("medium", "metric")).toEqual([
      500, 1000, 2000, 5000, 10_000, 15_000, 40_000,
    ]);
    expect(radarPresetsMetersForGameSizeAndUnit("large", "metric")).toEqual(
      METRIC_RADAR_PRESET_METERS,
    );
  });

  it("gates thermometer presets by game size in metric edition", () => {
    expect(thermometerPresetsMetersForGameSizeAndUnit("small", "metric")).toEqual([
      1000, 5000,
    ]);
    expect(thermometerPresetsMetersForGameSizeAndUnit("medium", "metric")).toEqual([
      1000, 5000, 15_000,
    ]);
    expect(thermometerPresetsMetersForGameSizeAndUnit("large", "metric")).toEqual([
      1000, 5000, 15_000, 75_000,
    ]);
  });

  it("derives imperial thermometer presets from canonical list", () => {
    expect(thermometerPresetsMetersForGameSizeAndUnit("small", "imperial")).toEqual(
      [0.5, 3].map(milesToMeters),
    );
  });
});

describe("gamePreset", () => {
  it("round-trips create session draft fields", () => {
    const advancedSettings = defaultAdvancedSessionSettings("medium", "metric");
    const preset = createSessionDraftToGamePreset(
      {
        gameSize: "medium",
        distanceUnit: "metric",
        advancedSettings,
      },
      "Weekly Dublin",
    );

    const draft = gamePresetToCreateSessionDraft(preset);
    expect(draft.gameSize).toBe("medium");
    expect(draft.distanceUnit).toBe("metric");
    expect(draft.advancedSettings.customCategories).toEqual([]);
  });
});
