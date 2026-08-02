import { useSyncExternalStore } from "react";
import type { MapTool } from "../../domain/map/mapToolTypes";
import { isQuestionDockTool } from "../../domain/map/mapTools";
import {
  isWizardPlacePhaseStep,
  sheetSnapFromStepId,
  type WizardSheetSnap,
} from "../../domain/wizard/phaseToSheetSnap";
import {
  getLatestWizardStepIdForTool,
  subscribeWizardStep,
} from "../tools/useSyncWizardStepRef";

export function useWizardSheetSnap(activeTool: MapTool) {
  const wizardActive = activeTool !== "none" && isQuestionDockTool(activeTool);
  const toolId = wizardActive ? activeTool : null;

  const wizardStepId = useSyncExternalStore(
    subscribeWizardStep,
    () => (toolId ? getLatestWizardStepIdForTool(toolId) : null),
    () => null,
  );

  const sheetSnap: WizardSheetSnap = wizardStepId
    ? sheetSnapFromStepId(wizardStepId)
    : "mid";
  const mapAttentionActive =
    wizardActive && wizardStepId !== null && isWizardPlacePhaseStep(wizardStepId);

  return {
    wizardStepId,
    sheetSnap,
    mapAttentionActive,
  };
}
