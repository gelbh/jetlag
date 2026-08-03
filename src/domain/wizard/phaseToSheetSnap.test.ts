import { describe, expect, it } from "vitest";
import {
  isWizardPlacePhaseStep,
  phaseToSheetSnap,
  sheetSnapFromStepId,
  wizardStepIdToPhase,
} from "./phaseToSheetSnap";

describe("phaseToSheetSnap", () => {
  it("maps place phase to peek and configure/ask to mid", () => {
    expect(phaseToSheetSnap("place")).toBe("peek");
    expect(phaseToSheetSnap("configure")).toBe("mid");
    expect(phaseToSheetSnap("ask")).toBe("mid");
  });

  it("derives phase from legacy wizard step ids", () => {
    expect(wizardStepIdToPhase("anchor")).toBe("place");
    expect(wizardStepIdToPhase("location")).toBe("place");
    expect(wizardStepIdToPhase("method")).toBe("configure");
    expect(wizardStepIdToPhase("distance")).toBe("configure");
    // Measuring Target is configure, not place/peek.
    expect(wizardStepIdToPhase("target")).toBe("configure");
    expect(wizardStepIdToPhase("source")).toBe("configure");
    expect(wizardStepIdToPhase("answer")).toBe("ask");
    expect(wizardStepIdToPhase("confirm")).toBe("ask");
  });

  it("keeps measuring target on mid snap, not peek", () => {
    expect(sheetSnapFromStepId("target")).toBe("mid");
    expect(isWizardPlacePhaseStep("target")).toBe(false);
  });

  it("derives sheet snap from step id", () => {
    expect(sheetSnapFromStepId("anchor")).toBe("peek");
    expect(sheetSnapFromStepId("method")).toBe("mid");
    expect(sheetSnapFromStepId("confirm")).toBe("mid");
  });

  it("flags place-phase steps for map attention", () => {
    expect(isWizardPlacePhaseStep("placement")).toBe(true);
    expect(isWizardPlacePhaseStep("category")).toBe(false);
  });
});
