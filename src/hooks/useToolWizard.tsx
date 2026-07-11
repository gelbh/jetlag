import { useCallback, useMemo, useState, type RefObject } from "react";
import { ToolStepper } from "../components/tools/shared/ToolStepper";
import {
  buildSteps,
  deriveStepStates,
  type ToolStepDefinition,
} from "../components/tools/shared/toolStepUtils";
import { useSyncWizardStepRef } from "./tools/useSyncWizardStepRef";

interface UseToolWizardOptions {
  wizardStepRef?: RefObject<string>;
}

export function useToolWizard(
  steps: readonly ToolStepDefinition[],
  options?: UseToolWizardOptions,
) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex] ?? steps[0]!;
  const stepId = step.id;
  const stepStates = useMemo(
    () => deriveStepStates(steps.length, stepIndex),
    [stepIndex, steps.length],
  );

  useSyncWizardStepRef(options?.wizardStepRef, stepId);

  const goNext = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const resetStep = useCallback(() => {
    setStepIndex(0);
  }, []);

  const stepper = (
    <ToolStepper steps={buildSteps(steps, stepStates)} />
  );

  return {
    step,
    stepId,
    stepIndex,
    stepStates,
    goNext,
    goBack,
    resetStep,
    setStepIndex,
    stepper,
  };
}
