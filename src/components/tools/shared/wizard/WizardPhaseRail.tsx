import { Fragment } from "react";

export interface WizardPhaseRailPhase {
  id: string;
  label: string;
}

export interface WizardPhaseRailProps {
  phases: readonly WizardPhaseRailPhase[];
  currentPhaseId: string;
  completePhaseIds: readonly string[];
}

type PhaseSegmentState = "complete" | "current" | "upcoming";

function segmentState(
  phaseId: string,
  currentPhaseId: string,
  completePhaseIds: readonly string[],
): PhaseSegmentState {
  if (phaseId === currentPhaseId) {
    return "current";
  }
  if (completePhaseIds.includes(phaseId)) {
    return "complete";
  }
  return "upcoming";
}

function segmentClassName(state: PhaseSegmentState): string {
  switch (state) {
    case "current":
      return "border-action/65 bg-action text-surface-base";
    case "complete":
      return "border-action/45 bg-action/60 text-surface-base";
    case "upcoming":
      return "border-border/85 bg-surface-panel text-ink-muted";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function connectorClassName(state: PhaseSegmentState): string {
  return state === "upcoming" ? "bg-border/40" : "bg-action/60";
}

export function WizardPhaseRail({
  phases,
  currentPhaseId,
  completePhaseIds,
}: WizardPhaseRailProps) {
  return (
    <div
      role="list"
      aria-label="Wizard phases"
      className="wizard-phase-rail flex min-w-0 items-stretch gap-0.5"
    >
      {phases.map((phase, index) => {
        const state = segmentState(phase.id, currentPhaseId, completePhaseIds);
        return (
          <Fragment key={phase.id}>
            {index > 0 ? (
              <div
                className={`h-px w-1.5 shrink-0 self-center ${connectorClassName(state)}`}
                aria-hidden
              />
            ) : null}
            <div
              role="listitem"
              aria-label={phase.label}
              aria-current={state === "current" ? "step" : undefined}
              className={`min-w-0 flex-1 rounded-[var(--radius-hud-sm)] border px-2 py-1.5 motion-safe:transition-colors motion-reduce:transition-none ${segmentClassName(state)}`}
            >
              <span className="block truncate text-center font-display text-xs font-semibold uppercase tracking-[0.08em] leading-snug">
                {phase.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
