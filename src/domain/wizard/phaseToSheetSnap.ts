import type { ToolWizardPhaseId } from "./toolWizardPhases";

export type WizardSheetSnap = "peek" | "mid" | "expand";

const PLACEMENT_STEP_IDS = new Set([
  "place",
  "anchor",
  "placement",
  // Measuring "target" is configure (category/POI), not map placement.
  "location",
]);

const ASK_STEP_IDS = new Set(["answer", "confirm"]);

export function wizardStepIdToPhase(stepId: string): ToolWizardPhaseId {
  if (PLACEMENT_STEP_IDS.has(stepId)) {
    return "place";
  }
  if (ASK_STEP_IDS.has(stepId)) {
    return "ask";
  }
  return "configure";
}

export function phaseToSheetSnap(phaseId: ToolWizardPhaseId): WizardSheetSnap {
  switch (phaseId) {
    case "place":
      return "peek";
    case "configure":
    case "ask":
      return "mid";
    default: {
      const _exhaustive: never = phaseId;
      return _exhaustive;
    }
  }
}

export function sheetSnapFromStepId(stepId: string): WizardSheetSnap {
  return phaseToSheetSnap(wizardStepIdToPhase(stepId));
}

export function isWizardPlacePhaseStep(stepId: string): boolean {
  return wizardStepIdToPhase(stepId) === "place";
}
