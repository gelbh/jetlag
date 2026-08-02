import { describe, expect, it } from "vitest";
import {
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
  MATCHING_WIZARD,
} from "../../domain/wizard/toolWizardPhases";
import {
  advancePhaseNavState,
  completePhaseIds,
  initialPhaseNavState,
  resolvePhaseId,
  resolveWizardStepId,
  retreatPhaseNavState,
} from "./toolWizardPhaseNav";

describe("toolWizardPhaseNav", () => {
  it("advances through matching configure continuum then ask", () => {
    let state = initialPhaseNavState(MATCHING_WIZARD);
    expect(resolvePhaseId(MATCHING_WIZARD, state)).toBe("place");
    expect(resolveWizardStepId(MATCHING_WIZARD, state)).toBe("place");

    state = advancePhaseNavState(MATCHING_WIZARD, state);
    expect(resolvePhaseId(MATCHING_WIZARD, state)).toBe("configure");
    expect(state.configureIndex).toBe(0);
    expect(resolveWizardStepId(MATCHING_WIZARD, state)).toBe("category");

    state = advancePhaseNavState(MATCHING_WIZARD, state);
    expect(state.configureIndex).toBe(1);
    expect(resolveWizardStepId(MATCHING_WIZARD, state)).toBe("resolve");

    state = advancePhaseNavState(MATCHING_WIZARD, state);
    expect(resolvePhaseId(MATCHING_WIZARD, state)).toBe("ask");
    expect(resolveWizardStepId(MATCHING_WIZARD, state)).toBe("ask");

    const stuck = advancePhaseNavState(MATCHING_WIZARD, state);
    expect(stuck).toEqual(state);
  });

  it("retreats into last configure step before place", () => {
    let state = {
      phaseIndex: MATCHING_WIZARD.phases.indexOf("ask"),
      configureIndex: 0,
    };

    state = retreatPhaseNavState(MATCHING_WIZARD, state);
    expect(resolvePhaseId(MATCHING_WIZARD, state)).toBe("configure");
    expect(state.configureIndex).toBe(1);

    state = retreatPhaseNavState(MATCHING_WIZARD, state);
    expect(state.configureIndex).toBe(0);

    state = retreatPhaseNavState(MATCHING_WIZARD, state);
    expect(resolvePhaseId(MATCHING_WIZARD, state)).toBe("place");

    state = retreatPhaseNavState(MATCHING_WIZARD, state);
    expect(state).toEqual(initialPhaseNavState(MATCHING_WIZARD));
  });

  it("skips empty configure when advancing and retreating", () => {
    let state = initialPhaseNavState(HIDING_ZONE_MOVE_WIZARD);
    expect(resolvePhaseId(HIDING_ZONE_MOVE_WIZARD, state)).toBe("place");

    state = advancePhaseNavState(HIDING_ZONE_MOVE_WIZARD, state);
    expect(resolvePhaseId(HIDING_ZONE_MOVE_WIZARD, state)).toBe("ask");

    state = retreatPhaseNavState(HIDING_ZONE_MOVE_WIZARD, state);
    expect(resolvePhaseId(HIDING_ZONE_MOVE_WIZARD, state)).toBe("place");
  });

  it("starts on configure for hiding zone create", () => {
    const state = initialPhaseNavState(HIDING_ZONE_CREATE_WIZARD);
    expect(resolvePhaseId(HIDING_ZONE_CREATE_WIZARD, state)).toBe("configure");
    expect(resolveWizardStepId(HIDING_ZONE_CREATE_WIZARD, state)).toBe(
      "method",
    );
  });

  it("marks prior phases complete", () => {
    const state = {
      phaseIndex: MATCHING_WIZARD.phases.indexOf("ask"),
      configureIndex: 0,
    };
    expect(completePhaseIds(MATCHING_WIZARD, state)).toEqual([
      "place",
      "configure",
    ]);
  });
});
