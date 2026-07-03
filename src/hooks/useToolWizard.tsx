import { useCallback, useMemo, useState } from "react";
import { ToolStepper } from "../components/tools/shared/ToolStepper";
import {
  buildSteps,
  deriveStepStates,
  type ToolStepDefinition,
} from "../components/tools/shared/toolStepUtils";

export function useToolWizard(steps: readonly ToolStepDefinition[]) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex] ?? steps[0]!;
  const stepStates = useMemo(
    () => deriveStepStates(steps.length, stepIndex),
    [stepIndex, steps.length],
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

  const stepper = (
    <ToolStepper steps={buildSteps(steps, stepStates)} />
  );

  return {
    step,
    stepIndex,
    stepStates,
    goNext,
    goBack,
    resetStep,
    setStepIndex,
    stepper,
  };
}
