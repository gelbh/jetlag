/** Phase spine placement step id plus legacy aliases during panel migration. */
const PLACEMENT_STEP_IDS = new Set([
  "place",
  "anchor",
  "placement",
  "target",
  "location",
]);

export function isWizardPlacementStep(stepId: string): boolean {
  return PLACEMENT_STEP_IDS.has(stepId);
}
