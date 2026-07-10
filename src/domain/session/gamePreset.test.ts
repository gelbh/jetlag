import { describe, expect, it } from "vitest";
import {
  GAME_PRESET_SCHEMA_VERSION,
  migrateGamePreset,
  migrateGamePresets,
} from "./gamePreset";

describe("migrateGamePreset", () => {
  it("deep-merges partial advancedSettings with defaults", () => {
    const migrated = migrateGamePreset({
      id: "p1",
      name: "Legacy",
      gameSize: "medium",
      distanceUnit: "imperial",
      advancedSettings: {
        expansionPackEnabled: true,
      },
    });

    expect(migrated.schemaVersion).toBe(GAME_PRESET_SCHEMA_VERSION);
    expect(migrated.advancedSettings.expansionPackEnabled).toBe(true);
    expect(migrated.advancedSettings.hidingPeriodMinutes).toBeGreaterThan(0);
    expect(migrated.migrationStatus).toBe("ok");
  });

  it("reconciles root custom fields into advancedSettings", () => {
    const migrated = migrateGamePreset({
      id: "p2",
      name: "Root custom",
      gameSize: "small",
      distanceUnit: "metric",
      customCategories: [{ id: "cat-1", label: "Test", ruleSummary: "Rule" }],
      advancedSettings: {},
    });

    expect(migrated.advancedSettings.customCategories).toHaveLength(1);
    expect(migrated.advancedSettings.customCategories[0]?.id).toBe("cat-1");
  });

  it("flags presets with unknown future schemaVersion", () => {
    const migrated = migrateGamePreset({
      id: "p3",
      name: "Future",
      schemaVersion: 99,
      gameSize: "large",
      distanceUnit: "imperial",
    });

    expect(migrated.migrationStatus).toBe("manual_required");
  });

  it("treats missing schemaVersion as v0", () => {
    const migrated = migrateGamePreset({
      id: "p4",
      name: "No version",
      gameSize: "medium",
      distanceUnit: "imperial",
    });

    expect(migrated.schemaVersion).toBe(GAME_PRESET_SCHEMA_VERSION);
    expect(migrated.advancedSettings.disabledTools).toEqual([]);
  });
});

describe("migrateGamePresets", () => {
  it("returns empty array for non-array input", () => {
    expect(migrateGamePresets(null)).toEqual([]);
  });

  it("migrates each preset in a list", () => {
    const presets = migrateGamePresets([
      { id: "a", name: "A", gameSize: "small", distanceUnit: "imperial" },
    ]);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.schemaVersion).toBe(GAME_PRESET_SCHEMA_VERSION);
  });
});
