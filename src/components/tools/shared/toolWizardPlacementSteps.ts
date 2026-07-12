const PLACEMENT_STEP_IDS = new Set([
  "anchor",
  "placement",
  "target",
  "location",
]);

export function isWizardPlacementStep(stepId: string): boolean {
  return PLACEMENT_STEP_IDS.has(stepId);
}
