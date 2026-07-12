import type { ReactNode } from "react";
import {
  HudCheckIcon,
  HudChevronLeftIcon,
  HudChevronRightIcon,
} from "../../ui/HudIcons";

interface WizardStepFooterProps {
  stepIndex: number;
  stepCount: number;
  canGoBack?: boolean;
  canGoNext?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  finishLabel?: string;
  showFinish?: boolean;
  extra?: ReactNode;
}

const iconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-hud-md)] border-2 border-border bg-surface-raised text-ink transition-colors hover:border-highlight hover:text-highlight disabled:pointer-events-none disabled:opacity-35";

const primaryIconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-hud-md)] border-2 border-action bg-action text-action-ink transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-40";

export function WizardStepFooter({
  stepIndex,
  stepCount,
  canGoBack = stepIndex > 0,
  canGoNext = true,
  onBack,
  onNext,
  nextLabel = "Next step",
  finishLabel = "Finish",
  showFinish = false,
  extra,
}: WizardStepFooterProps) {
  const isLastStep = stepIndex >= stepCount - 1;

  return (
    <div className="flex items-center gap-2">
      {canGoBack ? (
        <button
          type="button"
          onClick={onBack}
          className={iconButtonClass}
          aria-label="Previous step"
        >
          <HudChevronLeftIcon className="size-5" aria-hidden />
        </button>
      ) : (
        <span className="size-11 shrink-0" aria-hidden />
      )}

      {extra ? <div className="min-w-0 flex-1">{extra}</div> : <span className="flex-1" />}

      {!isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={primaryIconButtonClass}
          aria-label={nextLabel}
        >
          <HudChevronRightIcon className="size-5" aria-hidden />
        </button>
      ) : showFinish ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={primaryIconButtonClass}
          aria-label={finishLabel}
        >
          <HudCheckIcon className="size-5" aria-hidden />
        </button>
      ) : (
        <span className="size-11 shrink-0" aria-hidden />
      )}
    </div>
  );
}
