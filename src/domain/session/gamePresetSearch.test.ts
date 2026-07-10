import { describe, expect, it } from "vitest";
import {
  buildBundledGamePresets,
  mergeBundledPresets,
} from "../regions/bundledGamePresets";
import { defaultAdvancedSessionSettings } from "./advancedSessionSettings";
import { filterGamePresetsForSearch } from "./gamePresetSearch";

describe("filterGamePresetsForSearch", () => {
  const bundledPresets = buildBundledGamePresets();
  const userPreset = {
    id: "preset-weekly",
    name: "Weekly game",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: 1,
    gameSize: "medium" as const,
    distanceUnit: "metric" as const,
    advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
    placeLabel: "Galway, Ireland",
    migrationStatus: "ok" as const,
  };
  const presets = mergeBundledPresets([userPreset]);

  it("returns all presets when the query is empty", () => {
    expect(filterGamePresetsForSearch(presets, "")).toHaveLength(presets.length);
    expect(filterGamePresetsForSearch(presets, "   ")).toHaveLength(presets.length);
  });

  it("matches bundled presets by name", () => {
    const results = filterGamePresetsForSearch(presets, "Fingal");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("bundled:dublin-fingal");
  });

  it("matches bundled presets by place label", () => {
    const results = filterGamePresetsForSearch(presets, "South Dublin");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("bundled:dublin-south-dublin");
  });

  it("matches bundled presets by hierarchy segment", () => {
    const results = filterGamePresetsForSearch(presets, "Ireland");
    expect(results.length).toBe(bundledPresets.length + 1);
    expect(
      results.filter((preset) => preset.id.startsWith("bundled:")).length,
    ).toBe(bundledPresets.length);
  });

  it("matches user presets by name and place label", () => {
    expect(
      filterGamePresetsForSearch(presets, "Weekly").map((preset) => preset.id),
    ).toEqual(["preset-weekly"]);
    expect(
      filterGamePresetsForSearch(presets, "Galway").map((preset) => preset.id),
    ).toEqual(["preset-weekly"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterGamePresetsForSearch(presets, "Tokyo")).toEqual([]);
  });

  it("sorts bundled presets before user presets", () => {
    const results = filterGamePresetsForSearch(presets, "Ireland");
    const firstUserIndex = results.findIndex(
      (preset) => preset.id === "preset-weekly",
    );
    const lastBundledIndex = results.findLastIndex((preset) =>
      preset.id.startsWith("bundled:"),
    );
    expect(firstUserIndex).toBeGreaterThan(lastBundledIndex);
  });
});
