import type { ReactElement } from "react";
import type { ToolWizardPhaseId } from "../../../../domain/wizard/toolWizardPhases";
import { WizardConfigureContinuum } from "./WizardConfigureContinuum";
import { WizardPhaseRail, type WizardPhaseRailPhase } from "./WizardPhaseRail";
import { WizardStepBackButton } from "./WizardStepNav";
import { WizardStepPrimaryButton } from "./WizardStepPrimaryButton";

export interface WizardPhaseStepperNav {
  canGoBack?: boolean;
  canGoNext?: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Overrides the hook-default Continue / commit label. */
  primaryLabel?: string;
}

export interface WizardPhaseStepperProps {
  phases: readonly WizardPhaseRailPhase[];
  currentPhaseId: ToolWizardPhaseId;
  completePhaseIds: readonly ToolWizardPhaseId[];
  configureSteps: readonly { id: string; label: string }[];
  configureIndex: number;
  nav?: WizardPhaseStepperNav;
}

export function WizardPhaseStepper({
  phases,
  currentPhaseId,
  completePhaseIds,
  configureSteps,
  configureIndex,
  nav,
}: WizardPhaseStepperProps): ReactElement {
  const navBack = nav ? (
    <WizardStepBackButton
      canGoBack={nav.canGoBack}
      onBack={nav.onBack}
      reserveSpace
    />
  ) : (
    <span className="wizard-step-nav-slot" aria-hidden />
  );
  const navNext = nav ? (
    <WizardStepPrimaryButton
      label={nav.primaryLabel ?? "Continue"}
      onClick={nav.onNext}
      disabled={nav.canGoNext === false}
    />
  ) : (
    <span className="wizard-step-nav-slot" aria-hidden />
  );

  return (
    <div className="wizard-phase-stepper space-y-1.5">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-1">
        {navBack}
        <WizardPhaseRail
          phases={phases}
          currentPhaseId={currentPhaseId}
          completePhaseIds={completePhaseIds}
        />
        {navNext}
      </div>
      {currentPhaseId === "configure" ? (
        <WizardConfigureContinuum
          steps={configureSteps}
          index={configureIndex}
        />
      ) : null}
    </div>
  );
}
