import { describe, expect, it } from "vitest";
import {
  defaultRadarPresetMeters,
  hidingZoneDefaultRadiusMeters,
  METRIC_RADAR_PRESET_METERS,
  radarPresetsMetersForGameSizeAndUnit,
  radarPresetMetersForUnit,
  thermometerPresetsMetersForGameSizeAndUnit,
} from "./distancePresets";
import {
  createSessionDraftToGamePreset,
  gamePresetToCreateSessionDraft,
} from "../session/gamePreset";
import { defaultAdvancedSessionSettings } from "../session/advancedSessionSettings";

describe("distancePresets", () => {
  it("uses native metric radar presets", () => {
    expect(radarPresetMetersForUnit("metric")).toEqual(METRIC_RADAR_PRESET_METERS);
    expect(defaultRadarPresetMeters("metric")).toBe(1000);
  });

  it("uses metric hiding zone radii", () => {
    expect(hidingZoneDefaultRadiusMeters("medium", "metric")).toBe(400);
    expect(hidingZoneDefaultRadiusMeters("large", "metric")).toBe(800);
  });

  it("gates radar presets by game size", () => {
    expect(radarPresetsMetersForGameSizeAndUnit("small", "metric")).toEqual([
      500, 1000, 2000, 5000, 10_000,
    ]);
    expect(radarPresetsMetersForGameSizeAndUnit("medium", "metric")).toEqual([
      500, 1000, 2000, 5000, 10_000, 20_000, 50_000,
    ]);
    expect(radarPresetsMetersForGameSizeAndUnit("large", "metric")).toEqual(
      METRIC_RADAR_PRESET_METERS,
    );
  });

  it("gates thermometer presets by game size in metric edition", () => {
    expect(thermometerPresetsMetersForGameSizeAndUnit("small", "metric")).toEqual([
      1000, 10_000,
    ]);
    expect(thermometerPresetsMetersForGameSizeAndUnit("large", "metric")).toEqual([
      1000, 10_000, 25_000, 50_000,
    ]);
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
