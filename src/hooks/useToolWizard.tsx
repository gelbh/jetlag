import { useCallback, useMemo, useState, type RefObject } from "react";
import { ToolStepper } from "../components/tools/shared/ToolStepper";
import type { WizardStepNavProps } from "../components/tools/shared/WizardStepNav";
import {
  buildSteps,
  deriveStepStates,
  type ToolStepDefinition,
} from "../components/tools/shared/toolStepUtils";
import { useSyncWizardStepRef } from "./tools/useSyncWizardStepRef";

interface UseToolWizardOptions {
  wizardStepRef?: RefObject<string>;
  initialStepId?: string;
  syncStep?: boolean;
}

function initialStepIndex(
  steps: readonly ToolStepDefinition[],
  initialStepId?: string,
): number {
  if (!initialStepId) {
    return 0;
  }
  const index = steps.findIndex((step) => step.id === initialStepId);
  return index >= 0 ? index : 0;
}

export function useToolWizard(
  steps: readonly ToolStepDefinition[],
  options?: UseToolWizardOptions,
) {
  const [stepIndex, setStepIndex] = useState(() =>
    initialStepIndex(steps, options?.initialStepId),
  );

  const step = steps[stepIndex] ?? steps[0]!;
  const stepId = step.id;
  const stepStates = useMemo(
    () => deriveStepStates(steps.length, stepIndex),
    [stepIndex, steps.length],
  );

  useSyncWizardStepRef(
    options?.syncStep === false ? undefined : options?.wizardStepRef,
    stepId,
  );

  const goNext = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const resetStep = useCallback(() => {
    setStepIndex(0);
  }, []);

  const progressSteps = useMemo(
    () => buildSteps(steps, stepStates),
    [stepStates, steps],
  );

  const Stepper = useCallback(
    ({ nav }: { nav?: WizardStepNavProps }) => (
      <ToolStepper steps={progressSteps} nav={nav} />
    ),
    [progressSteps],
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
    progressSteps,
    Stepper,
  };
}
