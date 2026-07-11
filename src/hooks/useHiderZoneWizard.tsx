import { useEffect, useMemo, useRef, type RefObject } from "react";
import { stepsForHidingZoneMode } from "../components/hider/hidingZoneSteps";
import { useToolWizard } from "./useToolWizard";

interface UseHiderZoneWizardParams {
  moveMode: boolean;
  wizardOpen: boolean;
  wizardStepRef?: RefObject<string>;
}

export function useHiderZoneWizard({
  moveMode,
  wizardOpen,
  wizardStepRef: wizardStepRefParam,
}: UseHiderZoneWizardParams) {
  const internalStepRef = useRef("method");
  const wizardStepRef = wizardStepRefParam ?? internalStepRef;
  const steps = useMemo(
    () => stepsForHidingZoneMode(moveMode),
    [moveMode],
  );

  const wizard = useToolWizard(steps, { wizardStepRef });

  useEffect(() => {
    if (wizardOpen) {
      wizard.resetStep();
    }
  }, [wizardOpen, wizard.resetStep]);

  useEffect(() => {
    wizard.resetStep();
  }, [moveMode, wizard.resetStep]);

  return {
    ...wizard,
    wizardStepRef,
    stepCount: steps.length,
  };
}
