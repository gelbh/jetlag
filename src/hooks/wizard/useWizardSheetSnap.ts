import { useEffect, useState } from "react";
import type { MapTool } from "../../domain/map/mapToolTypes";
import { isQuestionDockTool } from "../../domain/map/mapTools";
import {
  isWizardPlacePhaseStep,
  sheetSnapFromStepId,
  type WizardSheetSnap,
} from "../../domain/wizard/phaseToSheetSnap";
import { WIZARD_STEP_CHANGE_EVENT } from "../tools/useSyncWizardStepRef";

export function useWizardSheetSnap(activeTool: MapTool) {
  const wizardActive = activeTool !== "none" && isQuestionDockTool(activeTool);
  const [wizardStepId, setWizardStepId] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset step when the active tool changes */
    setWizardStepId(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  useEffect(() => {
    if (!wizardActive) {
      return;
    }

    const handleStepChange = (event: Event) => {
      const detail = (event as CustomEvent<{ stepId: string }>).detail;
      setWizardStepId(detail.stepId);
    };

    window.addEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
    return () => window.removeEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
  }, [wizardActive]);

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
