export function toolWizardSwipeNext(
  canGoNext: boolean,
  stepIndex: number,
  stepCount: number,
): boolean {
  return canGoNext && stepIndex < stepCount - 1;
}
