import { useEffect, type RefObject } from "react";

export function useSyncWizardStepRef(
  wizardStepRef: RefObject<string> | undefined,
  stepId: string,
): void {
  useEffect(() => {
    if (wizardStepRef) {
      wizardStepRef.current = stepId;
    }
  }, [stepId, wizardStepRef]);
}
