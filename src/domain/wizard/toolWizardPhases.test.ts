import { describe, expect, it } from "vitest";
import {
  THERMOMETER_WIZARD,
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
  phaseRailLabels,
  resolveAskMode,
  primaryFooterLabel,
} from "./toolWizardPhases";

describe("toolWizardPhases", () => {
  it("thermometer starts on place with configure distance", () => {
    expect(THERMOMETER_WIZARD.startsOn).toBe("place");
    expect(THERMOMETER_WIZARD.configureSteps.map((s) => s.id)).toEqual([
      "distance",
    ]);
  });

  it("hiding zone create starts on configure (method)", () => {
    expect(HIDING_ZONE_CREATE_WIZARD.startsOn).toBe("configure");
    expect(HIDING_ZONE_CREATE_WIZARD.configureSteps[0]?.id).toBe("method");
  });

  it("hiding zone move has no configure steps", () => {
    expect(HIDING_ZONE_MOVE_WIZARD.configureSteps).toEqual([]);
    expect(HIDING_ZONE_MOVE_WIZARD.startsOn).toBe("place");
  });

  it("labels Ask vs Send from awaitHiderAnswer", () => {
    const solo = phaseRailLabels(THERMOMETER_WIZARD, false);
    const mp = phaseRailLabels(THERMOMETER_WIZARD, true);
    expect(solo.find((p) => p.id === "ask")?.label).toBe("Ask");
    expect(mp.find((p) => p.id === "ask")?.label).toBe("Send");
    expect(resolveAskMode(THERMOMETER_WIZARD, true)).toBe("send");
  });

  it("primary footer Continue vs commit", () => {
    expect(
      primaryFooterLabel({
        phase: "place",
        askMode: "ask",
        isSubmitting: false,
        toolCommitLabel: "Add radar question",
      }),
    ).toBe("Continue");
    expect(
      primaryFooterLabel({
        phase: "ask",
        askMode: "ask",
        isSubmitting: false,
        toolCommitLabel: "Add radar question",
      }),
    ).toBe("Add radar question");
  });
});
