import { describe, expect, it } from "vitest";
import { createSessionDraftToGamePreset } from "./gamePreset";
import { defaultAdvancedSessionSettings } from "./advancedSessionSettings";
import {
  buildFavouritePresetSelectOptions,
  isFavouritePresetId,
  resolveFavouritePresets,
  sortPresetsWithFavouritesFirst,
  withoutFavouritePresetId,
} from "./presetFavourites";

describe("presetFavourites", () => {
  const presetA = createSessionDraftToGamePreset(
    {
      gameSize: "small",
      distanceUnit: "metric",
      advancedSettings: defaultAdvancedSessionSettings("small", "metric"),
    },
    "Alpha",
  );
  const presetB = createSessionDraftToGamePreset(
    {
      gameSize: "medium",
      distanceUnit: "metric",
      advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
    },
    "Bravo",
  );
  const presetC = createSessionDraftToGamePreset(
    {
      gameSize: "large",
      distanceUnit: "metric",
      advancedSettings: defaultAdvancedSessionSettings("large", "metric"),
    },
    "Charlie",
  );

  it("tracks favourite membership", () => {
    expect(isFavouritePresetId(["a", "b"], "a")).toBe(true);
    expect(isFavouritePresetId(["a", "b"], "c")).toBe(false);
  });

  it("resolves favourites in stored order and skips missing ids", () => {
    expect(
      resolveFavouritePresets([presetA, presetB, presetC], [
        presetC.id,
        "missing",
        presetA.id,
      ]).map((preset) => preset.name),
    ).toEqual(["Charlie", "Alpha"]);
  });

  it("sorts favourites before the rest", () => {
    expect(
      sortPresetsWithFavouritesFirst([presetA, presetB, presetC], [
        presetC.id,
        presetA.id,
      ]).map((preset) => preset.name),
    ).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("builds select options from favourite order", () => {
    expect(
      buildFavouritePresetSelectOptions([presetA, presetB], [presetB.id, presetA.id]),
    ).toEqual([
      { presetId: presetB.id, name: "Bravo" },
      { presetId: presetA.id, name: "Alpha" },
    ]);
  });

  it("removes favourite ids", () => {
    expect(withoutFavouritePresetId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
});
