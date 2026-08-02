import {
  HudCheckIcon,
  HudChevronLeftIcon,
  HudChevronRightIcon,
} from "../../../ui/brand/HudIcons";

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
  /** Labeled primary CTA (Continue / tool commit) instead of icon-only nav. */
  primaryLabel?: string;
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
  primaryLabel,
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
  | "primaryLabel"
> & {
  reserveSpace?: boolean;
}) {
  const isLastStep = stepIndex >= stepCount - 1;

  if (primaryLabel) {
    return (
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className={`inline-flex min-h-9 min-w-[5.5rem] shrink-0 items-center justify-center rounded-[var(--radius-hud-md)] border border-border/85 bg-surface-panel px-3 font-display text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted motion-safe:transition-[background,border-color,color] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-35 ${
          canGoNext
            ? "border-highlight/55 text-highlight hover:border-highlight/45 hover:bg-surface-raised"
            : ""
        }`}
      >
        {primaryLabel}
      </button>
    );
  }

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
  primaryLabel,
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
        primaryLabel={primaryLabel}
      />
    </div>
  );
}
