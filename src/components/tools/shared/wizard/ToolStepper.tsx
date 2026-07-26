import type { WizardStepNavProps } from "./WizardStepNav";
import { WizardStepBackButton, WizardStepNextButton } from "./WizardStepNav";

export type ToolStepState = "complete" | "current" | "upcoming";

export interface ToolStep {
  id: string;
  label: string;
  state: ToolStepState;
}

interface ToolStepperProps {
  steps: readonly ToolStep[];
  /** Step title row; off when an outer heading already shows the step name (tutorial). */
  showLabel?: boolean;
  /** Extra classes on the centered step title row. */
  labelClassName?: string;
  nav?: WizardStepNavProps;
}

function ProgressDots({ steps }: { steps: readonly ToolStep[] }) {
  return (
    <>
      {steps.map((step, index) => (
        <div key={step.id} role="listitem" className="flex min-w-0 flex-1 items-center">
          {index > 0 ? (
            <div
              className={`h-px flex-1 motion-safe:transition-colors motion-reduce:transition-none ${
                step.state === "upcoming" ? "bg-border/40" : "bg-action/60"
              }`}
              aria-hidden
            />
          ) : null}
          <span
            className={`mx-0.5 size-2 shrink-0 rounded-full motion-safe:transition-colors motion-reduce:transition-none ${
              step.state === "complete"
                ? "bg-action"
                : step.state === "current"
                  ? "bg-action ring-2 ring-action/35"
                  : "bg-border"
            }`}
            aria-hidden
          />
          {index < steps.length - 1 ? (
            <div
              className={`h-px flex-1 motion-safe:transition-colors motion-reduce:transition-none ${
                step.state === "complete" ? "bg-action/60" : "bg-border/40"
              }`}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </>
  );
}

export function ToolStepper({
  steps,
  showLabel = true,
  labelClassName = "",
  nav,
}: ToolStepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.state === "current"),
  );
  const currentStep = steps[currentIndex] ?? steps[0];
  const reserveNavSpace = showLabel;
  const navBack = nav ? (
    <WizardStepBackButton
      canGoBack={nav.canGoBack}
      onBack={nav.onBack}
      reserveSpace={reserveNavSpace}
    />
  ) : null;
  const navNext = nav ? (
    <WizardStepNextButton
      stepIndex={nav.stepIndex}
      stepCount={nav.stepCount}
      canGoNext={nav.canGoNext}
      onNext={nav.onNext}
      nextLabel={nav.nextLabel}
      finishLabel={nav.finishLabel}
      showFinish={nav.showFinish}
      reserveSpace={reserveNavSpace}
    />
  ) : null;

  const stepTitle = currentStep ? (
    <p
      key={currentStep.id}
      className={`jl-step-enter min-w-0 text-center text-xs leading-snug text-ink-muted motion-reduce:animate-none ${labelClassName}`}
    >
      <span className="font-medium text-ink">{currentStep.label}</span>
      <span aria-hidden="true"> · </span>
      <span className="tabular-nums">
        {currentIndex + 1} of {steps.length}
      </span>
    </p>
  ) : null;

  if (showLabel && nav) {
    return (
      <div role="list" aria-label="Progress" className="wizard-stepper space-y-1.5">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-1">
          {navBack}
          {stepTitle}
          {navNext}
        </div>
        <div className="flex items-center">
          <ProgressDots steps={steps} />
        </div>
      </div>
    );
  }

  if (nav) {
    return (
      <div role="list" aria-label="Progress" className="wizard-stepper">
        <div className="flex items-center gap-2">
          {navBack}
          <div className="flex min-w-0 flex-1 items-center">
            <ProgressDots steps={steps} />
          </div>
          {navNext}
        </div>
      </div>
    );
  }

  return (
    <div role="list" aria-label="Progress" className="wizard-stepper space-y-1.5">
      {showLabel ? stepTitle : null}
      <div className="flex items-center">
        <ProgressDots steps={steps} />
      </div>
    </div>
  );
}
