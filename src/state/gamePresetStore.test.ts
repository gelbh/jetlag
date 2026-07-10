import { beforeEach, describe, expect, it } from "vitest";
import { useGamePresetStore } from "./gamePresetStore";
import { defaultAdvancedSessionSettings } from "../domain/session/advancedSessionSettings";
import { mergeBundledPresets } from "../domain/regions/bundledGamePresets";
import {
  createSessionDraftToGamePreset,
  gamePresetToCreateSessionDraft,
} from "../domain/session/gamePreset";

describe("gamePresetStore", () => {
  beforeEach(() => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
  });

  it("saves and retrieves presets", () => {
    const preset = createSessionDraftToGamePreset(
      {
        gameSize: "large",
        distanceUnit: "metric",
        advancedSettings: defaultAdvancedSessionSettings("large", "metric"),
      },
      "Regional metric",
    );

    useGamePresetStore.getState().savePreset(preset);

    expect(useGamePresetStore.getState().getPreset(preset.id)?.name).toBe(
      "Regional metric",
    );
    expect(useGamePresetStore.getState().presets).toHaveLength(6);
  });

  it("deletes user presets but keeps bundled presets", () => {
    const preset = createSessionDraftToGamePreset(
      {
        gameSize: "small",
        distanceUnit: "imperial",
        advancedSettings: defaultAdvancedSessionSettings("small"),
      },
      "Neighborhood",
    );

    useGamePresetStore.getState().savePreset(preset);
    useGamePresetStore.getState().deletePreset(preset.id);

    expect(useGamePresetStore.getState().presets).toHaveLength(5);
    expect(
      useGamePresetStore.getState().presets.every((entry) => entry.bundled),
    ).toBe(true);
  });

  it("round-trips preset drafts", () => {
    const preset = createSessionDraftToGamePreset(
      {
        gameSize: "medium",
        distanceUnit: "metric",
        advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
      },
      "Round trip",
    );

    const draft = gamePresetToCreateSessionDraft(preset);
    expect(draft.distanceUnit).toBe("metric");
    expect(draft.gameSize).toBe("medium");
  });
});
