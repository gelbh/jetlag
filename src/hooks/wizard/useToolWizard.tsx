import { useCallback, useMemo, useState, type ReactElement, type RefObject } from "react";
import { WizardConfigureContinuum } from "../../components/tools/shared/wizard/WizardConfigureContinuum";
import { WizardPhaseRail } from "../../components/tools/shared/wizard/WizardPhaseRail";
import { ToolStepper } from "../../components/tools/shared/wizard/ToolStepper";
import type { WizardStepNavProps } from "../../components/tools/shared/wizard/WizardStepNav";
import {
  WizardStepBackButton,
  WizardStepNextButton,
} from "../../components/tools/shared/wizard/WizardStepNav";
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

type UseToolWizardOptions =
  | UseToolWizardLegacyOptions
  | UseToolWizardPhaseOptions;

type PhaseStepperComponent = (props: {
  nav?: WizardStepNavProps;
}) => ReactElement | null;

type LegacyStepperComponent = (props: {
  nav?: WizardStepNavProps;
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
  stepIndex: number;
  stepCount: number;
  goNext: () => void;
  goBack: () => void;
  resetStep: () => void;
  Stepper: PhaseStepperComponent;
  phaseIndex: number;
  setPhaseIndex: (index: number) => void;
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
  options?: UseToolWizardOptions,
): LegacyToolWizardResult | PhaseToolWizardResult {
  const phaseMode = isWizardDefinition(stepsOrDef);
  const legacySteps = phaseMode ? [] : stepsOrDef;
  const phaseDef = phaseMode ? stepsOrDef : null;

  const [stepIndex, setStepIndex] = useState(() =>
    phaseMode ? 0 : initialStepIndex(legacySteps, options?.initialStepId),
  );
  const [navState, setNavState] = useState<PhaseNavState>(() =>
    phaseDef
      ? initialPhaseState(phaseDef, options?.initialStepId)
      : initialPhaseNavState({
          toolId: "",
          phases: ["place"],
          configureSteps: [],
          askMode: "ask",
          startsOn: "place",
        }),
  );

  const awaitHiderAnswer =
    phaseMode && options && "awaitHiderAnswer" in options
      ? (options.awaitHiderAnswer ?? false)
      : false;
  const toolCommitLabel =
    phaseMode && options && "toolCommitLabel" in options
      ? (options.toolCommitLabel ?? "Continue")
      : "Continue";
  const isSubmitting =
    phaseMode && options && "isSubmitting" in options
      ? (options.isSubmitting ?? false)
      : false;

  const legacyStep = legacySteps[stepIndex] ?? legacySteps[0];
  const legacyStepId = legacyStep?.id ?? "";
  const stepStates = useMemo(
    () => deriveStepStates(legacySteps.length, stepIndex),
    [legacySteps.length, stepIndex],
  );
  const progressSteps = useMemo(
    () => buildSteps(legacySteps, stepStates),
    [legacySteps, stepStates],
  );

  const phaseId = phaseDef ? resolvePhaseId(phaseDef, navState) : "place";
  const configureIndex = phaseDef ? navState.configureIndex : 0;
  const stepId = phaseDef
    ? resolveWizardStepId(phaseDef, navState)
    : legacyStepId;
  const phases = useMemo(
    () => (phaseDef ? phaseRailLabels(phaseDef, awaitHiderAnswer) : []),
    [awaitHiderAnswer, phaseDef],
  );
  const completedIds = useMemo(
    () => (phaseDef ? completePhaseIds(phaseDef, navState) : []),
    [navState, phaseDef],
  );
  const askMode = phaseDef
    ? resolveAskMode(phaseDef, awaitHiderAnswer)
    : "ask";
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
    if (phaseDef) {
      setNavState((current) => advancePhaseNavState(phaseDef, current));
      return;
    }
    setStepIndex((current) => Math.min(current + 1, legacySteps.length - 1));
  }, [legacySteps.length, phaseDef]);

  const goBack = useCallback(() => {
    if (phaseDef) {
      setNavState((current) => retreatPhaseNavState(phaseDef, current));
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  }, [phaseDef]);

  const resetStep = useCallback(() => {
    if (phaseDef) {
      setNavState(initialPhaseNavState(phaseDef));
      return;
    }
    setStepIndex(0);
  }, [phaseDef]);

  const LegacyStepper = useCallback(
    ({ nav }: { nav?: WizardStepNavProps }) => (
      <ToolStepper steps={progressSteps} nav={nav} />
    ),
    [progressSteps],
  );

  const PhaseStepper = useCallback(
    ({ nav }: { nav?: WizardStepNavProps }) => {
      if (!phaseDef) {
        return null;
      }

      const navBack = nav ? (
        <WizardStepBackButton
          canGoBack={nav.canGoBack}
          onBack={nav.onBack}
          reserveSpace
        />
      ) : null;
      const navNext = nav ? (
        <WizardStepNextButton
          stepIndex={nav.stepIndex}
          stepCount={nav.stepCount}
          canGoNext={nav.canGoNext}
          onNext={nav.onNext}
          primaryLabel={nav.primaryLabel ?? footerLabel}
          reserveSpace
        />
      ) : null;

      return (
        <div className="wizard-phase-stepper space-y-1.5">
          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-1">
            {navBack}
            <WizardPhaseRail
              phases={phases}
              currentPhaseId={phaseId}
              completePhaseIds={completedIds}
            />
            {navNext}
          </div>
          {phaseId === "configure" ? (
            <WizardConfigureContinuum
              steps={phaseDef.configureSteps}
              index={configureIndex}
            />
          ) : null}
        </div>
      );
    },
    [completedIds, configureIndex, footerLabel, phaseDef, phaseId, phases],
  );

  if (phaseMode && phaseDef) {
    return {
      phaseId,
      configureIndex,
      stepId,
      stepIndex: navState.phaseIndex,
      stepCount: phaseDef.phases.length,
      goNext,
      goBack,
      resetStep,
      Stepper: PhaseStepper,
      phaseIndex: navState.phaseIndex,
      setPhaseIndex: (index: number) => {
        setNavState({ phaseIndex: index, configureIndex: 0 });
      },
    } satisfies PhaseToolWizardResult;
  }

  return {
    step: legacyStep!,
    stepId: legacyStepId,
    stepIndex,
    stepStates,
    goNext,
    goBack,
    resetStep,
    setStepIndex,
    progressSteps,
    Stepper: LegacyStepper,
  } satisfies LegacyToolWizardResult;
}

export type { ToolWizardPhaseId };
