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
      return "bg-action";
    case "upcoming":
      return "bg-border";
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
      <p className="min-w-0 text-center text-xs leading-snug text-ink-muted">
        <span className="font-medium text-ink">{currentStep?.label}</span>
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
                    state === "upcoming" ? "bg-border/40" : "bg-action/60"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`mx-0.5 size-2 shrink-0 rounded-full motion-safe:transition-colors motion-reduce:transition-none ${dotClassName(state)} ${
                  state === "current" ? "ring-2 ring-action/35" : ""
                }`}
                aria-hidden
              />
              {stepIndex < steps.length - 1 ? (
                <div
                  className={`h-px flex-1 motion-safe:transition-colors motion-reduce:transition-none ${
                    state === "complete" ? "bg-action/60" : "bg-border/40"
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
