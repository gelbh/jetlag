import { useEffect, type RefObject } from "react";

export const WIZARD_STEP_CHANGE_EVENT = "jetlag:wizard-step-change";

export function useSyncWizardStepRef(
  wizardStepRef: RefObject<string> | undefined,
  stepId: string,
): void {
  useEffect(() => {
    if (wizardStepRef) {
      wizardStepRef.current = stepId;
    }

    window.dispatchEvent(
      new CustomEvent(WIZARD_STEP_CHANGE_EVENT, { detail: { stepId } }),
    );
  }, [stepId, wizardStepRef]);
}
