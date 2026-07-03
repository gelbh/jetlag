interface ToolWizardNavProps {
  stepIndex: number;
  stepCount: number;
  canGoBack?: boolean;
  canGoNext?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function ToolWizardNav({
  stepIndex,
  stepCount,
  canGoBack = stepIndex > 0,
  canGoNext = true,
  onBack,
  onNext,
  nextLabel = "Next",
}: ToolWizardNavProps) {
  const isLastStep = stepIndex >= stepCount - 1;

  if (isLastStep) {
    return canGoBack ? (
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="flex gap-2 pt-1">
      {canGoBack ? (
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="btn-primary flex-1 disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}
