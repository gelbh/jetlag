import { describe, expect, it } from "vitest";
import {
  MATCHING_STEPS,
  RADAR_STEPS,
  stepsForMode,
} from "./toolStepUtils";

describe("stepsForMode", () => {
  it("drops the answer step in multiplayer", () => {
    expect(stepsForMode(RADAR_STEPS, true).map((step) => step.id)).toEqual([
      "distance",
      "anchor",
    ]);
    expect(stepsForMode(MATCHING_STEPS, true).map((step) => step.id)).toEqual([
      "category",
      "anchor",
      "resolve",
    ]);
  });

  it("keeps all steps in solo mode", () => {
    expect(stepsForMode(RADAR_STEPS, false)).toEqual(RADAR_STEPS);
  });
});
