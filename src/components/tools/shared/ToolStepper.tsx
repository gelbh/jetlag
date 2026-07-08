export type ToolStepState = "complete" | "current" | "upcoming";

export interface ToolStep {
  id: string;
  label: string;
  state: ToolStepState;
}

interface ToolStepperProps {
  steps: readonly ToolStep[];
}

export function ToolStepper({ steps }: ToolStepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.state === "current"),
  );
  const currentStep = steps[currentIndex] ?? steps[0];

  return (
    <div role="list" aria-label="Progress" className="space-y-1">
      <div className="flex items-center">
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
      </div>
      {currentStep ? (
        <p
          key={currentStep.id}
          className="jl-step-enter text-center text-xs leading-snug text-ink-muted motion-reduce:animate-none"
        >
          <span className="font-medium text-ink">{currentStep.label}</span>
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">
            {currentIndex + 1} of {steps.length}
          </span>
        </p>
      ) : null}
    </div>
  );
}
