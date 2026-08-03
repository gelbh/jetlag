import { useLayoutEffect, type RefObject } from "react";

export const WIZARD_STEP_CHANGE_EVENT = "jetlag:wizard-step-change";

type WizardStepSnapshot = {
  toolId: string | null;
  stepId: string | null;
};

type WizardStepListener = () => void;

let latestWizardStep: WizardStepSnapshot = { toolId: null, stepId: null };
const wizardStepListeners = new Set<WizardStepListener>();

function notifyWizardStepListeners(): void {
  for (const listener of wizardStepListeners) {
    listener();
  }
}

/** Publish the active wizard step for sheet-snap / map-attention subscribers. */
export function publishWizardStep(
  toolId: string | null,
  stepId: string,
): void {
  latestWizardStep = { toolId, stepId };
  notifyWizardStepListeners();
  window.dispatchEvent(
    new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
      detail: { toolId, stepId },
    }),
  );
}

export function subscribeWizardStep(listener: WizardStepListener): () => void {
  wizardStepListeners.add(listener);
  return () => {
    wizardStepListeners.delete(listener);
  };
}

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
 * Keep a parent-owned ref + sheet-snap subscribers in sync with the active
 * wizard step. Publishes in useLayoutEffect so `useSyncExternalStore` readers
 * see the place-phase step in the same commit as tool open/switch.
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
    publishWizardStep(scopedToolId, stepId);
  }, [scopedToolId, stepId, wizardStepRef]);
}
