export interface WizardConfigureContinuumStep {
  id: string;
  label: string;
}

export interface WizardConfigureContinuumProps {
  steps: readonly WizardConfigureContinuumStep[];
  index: number;
}

function dotClassName(state: "complete" | "current" | "upcoming"): string {
  switch (state) {
    case "complete":
    case "current":
      return "bg-flag";
    case "upcoming":
      return "bg-rule";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function WizardConfigureContinuum({
  steps,
  index,
}: WizardConfigureContinuumProps) {
  if (steps.length <= 1) {
    return null;
  }

  const currentStep = steps[index] ?? steps[0];

  return (
    <div
      role="list"
      aria-label="Configure steps"
      className="wizard-configure-continuum space-y-1"
    >
      <p className="min-w-0 text-center text-xs leading-snug text-field-ink-muted">
        <span className="font-medium text-field-ink">{currentStep?.label}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-nums">
          {index + 1} of {steps.length}
        </span>
      </p>
      <div className="flex items-center">
        {steps.map((step, stepIndex) => {
          const state =
            stepIndex === index
              ? "current"
              : stepIndex < index
                ? "complete"
                : "upcoming";
          return (
            <div
              key={step.id}
              role="listitem"
              className="flex min-w-0 flex-1 items-center"
            >
              {stepIndex > 0 ? (
                <div
                  className={`h-px flex-1 motion-safe:transition-colors motion-reduce:transition-none ${
                    state === "upcoming" ? "bg-rule/40" : "bg-flag/60"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`mx-0.5 size-2 shrink-0 rounded-full motion-safe:transition-colors motion-reduce:transition-none ${dotClassName(state)} ${
                  state === "current" ? "ring-2 ring-flag/35" : ""
                }`}
                aria-hidden
              />
              {stepIndex < steps.length - 1 ? (
                <div
                  className={`h-px flex-1 motion-safe:transition-colors motion-reduce:transition-none ${
                    state === "complete" ? "bg-flag/60" : "bg-rule/40"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
