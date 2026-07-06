import { beforeEach, describe, expect, it } from "vitest";
import { useGamePresetStore } from "./gamePresetStore";
import { defaultAdvancedSessionSettings } from "../domain/advancedSessionSettings";
import {
  createSessionDraftToGamePreset,
  gamePresetToCreateSessionDraft,
} from "../domain/gamePreset";

describe("gamePresetStore", () => {
  beforeEach(() => {
    useGamePresetStore.setState({ presets: [] });
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
  });

  it("deletes presets by id", () => {
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

    expect(useGamePresetStore.getState().presets).toHaveLength(0);
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
