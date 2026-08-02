import type { ToolWizardPhaseId } from "../../../../domain/wizard/toolWizardPhases";

export function toolWizardSwipeNext(
  canGoNext: boolean,
  stepIndex: number,
  stepCount: number,
): boolean {
  return canGoNext && stepIndex < stepCount - 1;
}

/**
 * Ask/Send/Confirm chrome primary is the commit CTA (primaryFooterLabel), not
 * phase advance. Wire onNext to the real commit handler so the labeled button
 * is never a no-op goNext on the last phase.
 */
export function toolWizardPhasePrimaryNav(input: {
  phaseId: ToolWizardPhaseId;
  goNext: () => void;
  onCommit: () => void;
  canGoNext: boolean;
  canCommit: boolean;
}): { onNext: () => void; canGoNext: boolean } {
  if (input.phaseId === "ask") {
    return { onNext: input.onCommit, canGoNext: input.canCommit };
  }
  return { onNext: input.goNext, canGoNext: input.canGoNext };
}
