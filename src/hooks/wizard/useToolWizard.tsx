import { useCallback, useMemo, useState, type ReactElement, type RefObject } from "react";
import {
  WizardPhaseStepper,
  type WizardPhaseStepperNav,
} from "../../components/tools/shared/wizard/WizardPhaseStepper";
import {
  phaseRailLabels,
  primaryFooterLabel,
  resolveAskMode,
  type ToolWizardDefinition,
  type ToolWizardPhaseId,
} from "../../domain/wizard/toolWizardPhases";
import { useSyncWizardStepRef } from "../tools/useSyncWizardStepRef";
import {
  advancePhaseNavState,
  completePhaseIds,
  initialPhaseNavState,
  resolvePhaseId,
  resolveWizardStepId,
  retreatPhaseNavState,
  type PhaseNavState,
} from "./toolWizardPhaseNav";

interface UseToolWizardOptions {
  wizardStepRef?: RefObject<string>;
  initialStepId?: string;
  syncStep?: boolean;
  awaitHiderAnswer?: boolean;
  toolCommitLabel?: string;
  isSubmitting?: boolean;
}

type PhaseStepperComponent = (props: {
  nav?: WizardPhaseStepperNav;
}) => ReactElement;

export interface PhaseToolWizardResult {
  phaseId: ToolWizardPhaseId;
  configureIndex: number;
  stepId: string;
  phaseIndex: number;
  phaseCount: number;
  goNext: () => void;
  goBack: () => void;
  resetStep: () => void;
  setPhaseIndex: (index: number) => void;
  Stepper: PhaseStepperComponent;
}

function initialPhaseState(
  def: ToolWizardDefinition,
  initialStepId?: string,
): PhaseNavState {
  const base = initialPhaseNavState(def);
  if (!initialStepId) {
    return base;
  }

  if (initialStepId === "place" || initialStepId === "ask") {
    const phaseIndex = def.phases.indexOf(initialStepId);
    if (phaseIndex >= 0) {
      return { phaseIndex, configureIndex: 0 };
    }
  }

  const configureIndex = def.configureSteps.findIndex(
    (step) => step.id === initialStepId,
  );
  if (configureIndex >= 0) {
    const phaseIndex = def.phases.indexOf("configure");
    if (phaseIndex >= 0) {
      return { phaseIndex, configureIndex };
    }
  }

  return base;
}

export function useToolWizard(
  def: ToolWizardDefinition,
  options?: UseToolWizardOptions,
): PhaseToolWizardResult {
  const awaitHiderAnswer = options?.awaitHiderAnswer ?? false;
  const toolCommitLabel = options?.toolCommitLabel ?? "Continue";
  const isSubmitting = options?.isSubmitting ?? false;

  const [navState, setNavState] = useState<PhaseNavState>(() =>
    initialPhaseState(def, options?.initialStepId),
  );

  const phaseId = resolvePhaseId(def, navState);
  const configureIndex = navState.configureIndex;
  const stepId = resolveWizardStepId(def, navState);
  const phases = useMemo(
    () => phaseRailLabels(def, awaitHiderAnswer),
    [awaitHiderAnswer, def],
  );
  const completedIds = useMemo(
    () => completePhaseIds(def, navState),
    [def, navState],
  );
  const askMode = resolveAskMode(def, awaitHiderAnswer);
  const footerLabel = primaryFooterLabel({
    phase: phaseId,
    askMode,
    isSubmitting,
    toolCommitLabel,
  });

  useSyncWizardStepRef(
    options?.syncStep === false ? undefined : options?.wizardStepRef,
    stepId,
  );

  const goNext = useCallback(() => {
    setNavState((current) => advancePhaseNavState(def, current));
  }, [def]);

  const goBack = useCallback(() => {
    setNavState((current) => retreatPhaseNavState(def, current));
  }, [def]);

  const resetStep = useCallback(() => {
    setNavState(initialPhaseNavState(def));
  }, [def]);

  const setPhaseIndex = useCallback((index: number) => {
    setNavState({ phaseIndex: index, configureIndex: 0 });
  }, []);

  const Stepper = useCallback(
    ({ nav }: { nav?: WizardPhaseStepperNav }) => (
      <WizardPhaseStepper
        phases={phases}
        currentPhaseId={phaseId}
        completePhaseIds={completedIds}
        configureSteps={def.configureSteps}
        configureIndex={configureIndex}
        nav={
          nav
            ? {
                ...nav,
                primaryLabel: nav.primaryLabel ?? footerLabel,
              }
            : undefined
        }
      />
    ),
    [completedIds, configureIndex, def.configureSteps, footerLabel, phaseId, phases],
  );

  return {
    phaseId,
    configureIndex,
    stepId,
    phaseIndex: navState.phaseIndex,
    phaseCount: def.phases.length,
    goNext,
    goBack,
    resetStep,
    setPhaseIndex,
    Stepper,
  };
}

export type { ToolWizardPhaseId };
