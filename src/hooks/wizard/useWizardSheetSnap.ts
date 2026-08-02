import { useLayoutEffect, useState } from "react";
import type { MapTool } from "../../domain/map/mapToolTypes";
import { isQuestionDockTool } from "../../domain/map/mapTools";
import {
  isWizardPlacePhaseStep,
  sheetSnapFromStepId,
  type WizardSheetSnap,
} from "../../domain/wizard/phaseToSheetSnap";
import {
  getLatestWizardStepIdForTool,
  WIZARD_STEP_CHANGE_EVENT,
} from "../tools/useSyncWizardStepRef";

type WizardStepChangeDetail = {
  stepId: string;
  toolId?: string | null;
};

export function useWizardSheetSnap(activeTool: MapTool) {
  const wizardActive = activeTool !== "none" && isQuestionDockTool(activeTool);
  const [wizardStepId, setWizardStepId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!wizardActive || activeTool === "none") {
      setWizardStepId(null);
      return;
    }

    const toolId = activeTool;

    const handleStepChange = (event: Event) => {
      const detail = (event as CustomEvent<WizardStepChangeDetail>).detail;
      if (detail.toolId != null && detail.toolId !== toolId) {
        return;
      }
      setWizardStepId(detail.stepId);
    };

    window.addEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
    // Child panel layout effects publish first; seed in case the event already
    // fired before this listener attached in the same commit.
    setWizardStepId(getLatestWizardStepIdForTool(toolId));

    return () => {
      window.removeEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
    };
  }, [activeTool, wizardActive]);

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
