import type { ToolWizardPhaseId } from "../../domain/wizard/toolWizardPhases";
import {
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
} from "../../domain/wizard/toolWizardPhases";

export {
  HIDING_ZONE_CREATE_WIZARD,
  HIDING_ZONE_MOVE_WIZARD,
};

/** Legacy step ids consumed by map pick / peek wiring outside the panel. */
export type HidingZoneStepId = "method" | "location" | "confirm";

export function hidingZoneWizardDef(moveMode: boolean) {
  return moveMode ? HIDING_ZONE_MOVE_WIZARD : HIDING_ZONE_CREATE_WIZARD;
}

export function hidingZoneStepIdFromPhase(
  phaseId: ToolWizardPhaseId,
): HidingZoneStepId {
  switch (phaseId) {
    case "configure":
      return "method";
    case "place":
      return "location";
    case "ask":
      return "confirm";
    default: {
      const _exhaustive: never = phaseId;
      return _exhaustive;
    }
  }
}
