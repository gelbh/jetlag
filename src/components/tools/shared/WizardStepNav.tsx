import {
  HudCheckIcon,
  HudChevronLeftIcon,
  HudChevronRightIcon,
} from "../../ui/HudIcons";

export interface WizardStepNavProps {
  stepIndex: number;
  stepCount: number;
  canGoBack?: boolean;
  canGoNext?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  finishLabel?: string;
  showFinish?: boolean;
}

function navSlotClassName(ready: boolean) {
  return ready ? "wizard-step-nav-btn is-ready" : "wizard-step-nav-btn";
}

export function WizardStepBackButton({
  canGoBack = true,
  onBack,
  reserveSpace = true,
}: Pick<WizardStepNavProps, "canGoBack" | "onBack"> & {
  reserveSpace?: boolean;
}) {
  if (!canGoBack) {
    return reserveSpace ? <span className="wizard-step-nav-slot" aria-hidden /> : null;
  }

  return (
    <button
      type="button"
      onClick={onBack}
      className="wizard-step-nav-btn"
      aria-label="Previous step"
    >
      <HudChevronLeftIcon className="size-4" aria-hidden />
    </button>
  );
}

export function WizardStepNextButton({
  stepIndex,
  stepCount,
  canGoNext = true,
  onNext,
  nextLabel = "Next step",
  finishLabel = "Finish",
  showFinish = false,
  reserveSpace = true,
}: Pick<
  WizardStepNavProps,
  | "stepIndex"
  | "stepCount"
  | "canGoNext"
  | "onNext"
  | "nextLabel"
  | "finishLabel"
  | "showFinish"
> & {
  reserveSpace?: boolean;
}) {
  const isLastStep = stepIndex >= stepCount - 1;

  if (isLastStep && !showFinish) {
    return reserveSpace ? <span className="wizard-step-nav-slot" aria-hidden /> : null;
  }

  const label = isLastStep ? finishLabel : nextLabel;

  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!canGoNext}
      className={navSlotClassName(canGoNext)}
      aria-label={label}
    >
      {isLastStep ? (
        <HudCheckIcon className="size-4" aria-hidden />
      ) : (
        <HudChevronRightIcon className="size-4" aria-hidden />
      )}
    </button>
  );
}

export function WizardStepNav({
  stepIndex,
  stepCount,
  canGoBack = stepIndex > 0,
  canGoNext = true,
  onBack,
  onNext,
  nextLabel = "Next step",
  finishLabel = "Finish",
  showFinish = false,
}: WizardStepNavProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <WizardStepBackButton canGoBack={canGoBack} onBack={onBack} />
      <WizardStepNextButton
        stepIndex={stepIndex}
        stepCount={stepCount}
        canGoNext={canGoNext}
        onNext={onNext}
        nextLabel={nextLabel}
        finishLabel={finishLabel}
        showFinish={showFinish}
      />
    </div>
  );
}
