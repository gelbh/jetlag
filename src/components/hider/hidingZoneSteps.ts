import type { ToolStepDefinition } from "../tools/shared/toolStepUtils";

export const HIDING_ZONE_STEPS = [
  { id: "method", label: "Method" },
  { id: "location", label: "Location" },
  { id: "confirm", label: "Confirm" },
] as const satisfies readonly ToolStepDefinition[];

export const HIDING_ZONE_MOVE_STEPS = [
  { id: "location", label: "Location" },
  { id: "confirm", label: "Confirm" },
] as const satisfies readonly ToolStepDefinition[];

export type HidingZoneStepId =
  | (typeof HIDING_ZONE_STEPS)[number]["id"]
  | (typeof HIDING_ZONE_MOVE_STEPS)[number]["id"];

export function stepsForHidingZoneMode(
  moveMode: boolean,
): readonly ToolStepDefinition[] {
  return moveMode ? HIDING_ZONE_MOVE_STEPS : HIDING_ZONE_STEPS;
}
