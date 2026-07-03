import { describe, expect, it } from "vitest";
import { deriveStepStates } from "./toolStepUtils";

describe("deriveStepStates", () => {
  it("marks the active wizard step as current", () => {
    expect(deriveStepStates(4, 3)).toEqual([
      "complete",
      "complete",
      "complete",
      "current",
    ]);
  });

  it("updates the current step when navigating backward", () => {
    expect(deriveStepStates(4, 1)).toEqual([
      "complete",
      "current",
      "upcoming",
      "upcoming",
    ]);
  });
});
