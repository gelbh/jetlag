import { useLayoutEffect, type RefObject } from "react";

export const WIZARD_STEP_CHANGE_EVENT = "jetlag:wizard-step-change";

type WizardStepSnapshot = {
  toolId: string | null;
  stepId: string | null;
};

let latestWizardStep: WizardStepSnapshot = { toolId: null, stepId: null };

export function getLatestWizardStepIdForTool(toolId: string): string | null {
  if (latestWizardStep.stepId == null) {
    return null;
  }
  // Legacy useToolWizard(steps) publishes toolId null; phase spine publishes
  // def.toolId. Accept unscoped publishes so place peek still seeds.
  if (
    latestWizardStep.toolId == null ||
    latestWizardStep.toolId === toolId
  ) {
    return latestWizardStep.stepId;
  }
  return null;
}

/**
 * Keep a parent-owned ref + sheet-snap listeners in sync with the active
 * wizard step. Publishes in useLayoutEffect (before parent layout effects) so
 * `useWizardSheetSnap` can seed peek on the same commit as tool open/switch.
 */
export function useSyncWizardStepRef(
  wizardStepRef: RefObject<string> | undefined,
  stepId: string,
  toolId?: string,
): void {
  const scopedToolId = toolId ?? null;

  useLayoutEffect(() => {
    if (wizardStepRef) {
      wizardStepRef.current = stepId;
    }
    latestWizardStep = { toolId: scopedToolId, stepId };
    window.dispatchEvent(
      new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
        detail: { toolId: scopedToolId, stepId },
      }),
    );
  }, [scopedToolId, stepId, wizardStepRef]);
}
