import { useCallback, useMemo, useState, type ReactElement, type RefObject } from "react";
import { ToolStepper } from "../../components/tools/shared/wizard/ToolStepper";
import type { WizardStepNavProps } from "../../components/tools/shared/wizard/WizardStepNav";
import {
  WizardPhaseStepper,
  type WizardPhaseStepperNav,
} from "../../components/tools/shared/wizard/WizardPhaseStepper";
import {
  buildSteps,
  deriveStepStates,
  type ToolStepDefinition,
} from "../../components/tools/shared/wizard/toolStepUtils";
import type { ToolStep, ToolStepState } from "../../components/tools/shared/wizard/ToolStepper";
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

interface UseToolWizardBaseOptions {
  wizardStepRef?: RefObject<string>;
  initialStepId?: string;
  syncStep?: boolean;
}

interface UseToolWizardLegacyOptions extends UseToolWizardBaseOptions {
  awaitHiderAnswer?: never;
  toolCommitLabel?: never;
  isSubmitting?: never;
}

interface UseToolWizardPhaseOptions extends UseToolWizardBaseOptions {
  awaitHiderAnswer?: boolean;
  toolCommitLabel?: string;
  isSubmitting?: boolean;
}

type LegacyStepperComponent = (props: {
  nav?: WizardStepNavProps;
}) => ReactElement;

type PhaseStepperComponent = (props: {
  nav?: WizardPhaseStepperNav;
}) => ReactElement;

export interface LegacyToolWizardResult {
  step: ToolStepDefinition;
  stepId: string;
  stepIndex: number;
  stepStates: ToolStepState[];
  goNext: () => void;
  goBack: () => void;
  resetStep: () => void;
  setStepIndex: (index: number) => void;
  progressSteps: ToolStep[];
  Stepper: LegacyStepperComponent;
}

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

function isWizardDefinition(
  input: readonly ToolStepDefinition[] | ToolWizardDefinition,
): input is ToolWizardDefinition {
  return "phases" in input && "configureSteps" in input;
}

function initialStepIndex(
  steps: readonly ToolStepDefinition[],
  initialStepId?: string,
): number {
  if (!initialStepId) {
    return 0;
  }
  const index = steps.findIndex((step) => step.id === initialStepId);
  return index >= 0 ? index : 0;
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

function useLegacyToolWizard(
  steps: readonly ToolStepDefinition[],
  options?: UseToolWizardLegacyOptions,
): LegacyToolWizardResult {
  const [stepIndex, setStepIndex] = useState(() =>
    initialStepIndex(steps, options?.initialStepId),
  );

  const step = steps[stepIndex] ?? steps[0]!;
  const stepId = step.id;
  const stepStates = useMemo(
    () => deriveStepStates(steps.length, stepIndex),
    [stepIndex, steps.length],
  );
  const progressSteps = useMemo(
    () => buildSteps(steps, stepStates),
    [stepStates, steps],
  );

  useSyncWizardStepRef(
    options?.syncStep === false ? undefined : options?.wizardStepRef,
    stepId,
  );

  const goNext = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const resetStep = useCallback(() => {
    setStepIndex(0);
  }, []);

  const Stepper = useCallback(
    ({ nav }: { nav?: WizardStepNavProps }) => (
      <ToolStepper steps={progressSteps} nav={nav} />
    ),
    [progressSteps],
  );

  return {
    step,
    stepId,
    stepIndex,
    stepStates,
    goNext,
    goBack,
    resetStep,
    setStepIndex,
    progressSteps,
    Stepper,
  };
}

function usePhaseToolWizard(
  def: ToolWizardDefinition,
  options?: UseToolWizardPhaseOptions,
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
    def.toolId,
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

export function useToolWizard(
  def: ToolWizardDefinition,
  options?: UseToolWizardPhaseOptions,
): PhaseToolWizardResult;
export function useToolWizard(
  steps: readonly ToolStepDefinition[],
  options?: UseToolWizardLegacyOptions,
): LegacyToolWizardResult;
export function useToolWizard(
  stepsOrDef: readonly ToolStepDefinition[] | ToolWizardDefinition,
  options?: UseToolWizardLegacyOptions | UseToolWizardPhaseOptions,
): LegacyToolWizardResult | PhaseToolWizardResult {
  // Call sites are mode-stable (always array or always definition across renders).
  if (isWizardDefinition(stepsOrDef)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- phase overload only
    return usePhaseToolWizard(stepsOrDef, options as UseToolWizardPhaseOptions | undefined);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- legacy overload only
  return useLegacyToolWizard(
    stepsOrDef,
    options as UseToolWizardLegacyOptions | undefined,
  );
}

export type { ToolWizardPhaseId };
