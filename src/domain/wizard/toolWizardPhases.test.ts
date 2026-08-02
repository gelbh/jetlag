import { describe, expect, it } from "vitest";
import {
  RADAR_WIZARD,
  MATCHING_WIZARD,
  TENTACLE_WIZARD,
  MEASURING_WIZARD,
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

  it("hiding create rail is Method→Place→Confirm and sticky confirm mode", () => {
    expect(HIDING_ZONE_CREATE_WIZARD.phases).toEqual([
      "configure",
      "place",
      "ask",
    ]);
    expect(HIDING_ZONE_CREATE_WIZARD.phases).toContain(
      HIDING_ZONE_CREATE_WIZARD.startsOn,
    );
    const labels = phaseRailLabels(HIDING_ZONE_CREATE_WIZARD, true);
    expect(labels.map((p) => p.label)).toEqual([
      "Configure",
      "Place",
      "Confirm",
    ]);
    expect(resolveAskMode(HIDING_ZONE_CREATE_WIZARD, false)).toBe("confirm");
    expect(resolveAskMode(HIDING_ZONE_CREATE_WIZARD, true)).toBe("confirm");
  });

  it("hiding move rail is Place→Confirm with empty configure", () => {
    expect(HIDING_ZONE_MOVE_WIZARD.phases).toEqual(["place", "ask"]);
    expect(phaseRailLabels(HIDING_ZONE_MOVE_WIZARD, false).map((p) => p.label)).toEqual([
      "Place",
      "Confirm",
    ]);
  });

  it("seeker configure continua match phase model ids", () => {
    expect(RADAR_WIZARD.configureSteps.map((s) => s.id)).toEqual(["distance"]);
    expect(MATCHING_WIZARD.configureSteps.map((s) => s.id)).toEqual([
      "category",
      "resolve",
    ]);
    expect(TENTACLE_WIZARD.configureSteps.map((s) => s.id)).toEqual([
      "category",
      "locations",
    ]);
    expect(MEASURING_WIZARD.configureSteps.map((s) => s.id)).toEqual([
      "source",
      "target",
    ]);
    for (const def of [
      RADAR_WIZARD,
      THERMOMETER_WIZARD,
      MATCHING_WIZARD,
      TENTACLE_WIZARD,
      MEASURING_WIZARD,
    ]) {
      expect(def.phases).toContain(def.startsOn);
      expect(def.askMode).toBe("ask");
    }
  });

  it("primary footer submitting labels by askMode", () => {
    expect(
      primaryFooterLabel({
        phase: "ask",
        askMode: "ask",
        isSubmitting: true,
        toolCommitLabel: "Add radar question",
      }),
    ).toBe("Adding…");
    expect(
      primaryFooterLabel({
        phase: "ask",
        askMode: "send",
        isSubmitting: true,
        toolCommitLabel: "Send to hiders",
      }),
    ).toBe("Sending…");
    expect(
      primaryFooterLabel({
        phase: "ask",
        askMode: "confirm",
        isSubmitting: true,
        toolCommitLabel: "Confirm zone",
      }),
    ).toBe("Confirming…");
    expect(
      primaryFooterLabel({
        phase: "configure",
        askMode: "ask",
        isSubmitting: true,
        toolCommitLabel: "Add radar question",
      }),
    ).toBe("Continue");
  });
});
