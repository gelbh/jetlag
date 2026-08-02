import type { ToolWizardDefinition, ToolWizardPhaseId } from "../../domain/wizard/toolWizardPhases";

export interface PhaseNavState {
  phaseIndex: number;
  configureIndex: number;
}

export function initialPhaseNavState(def: ToolWizardDefinition): PhaseNavState {
  const phaseIndex = def.phases.indexOf(def.startsOn);
  return {
    phaseIndex: phaseIndex >= 0 ? phaseIndex : 0,
    configureIndex: 0,
  };
}

function isEmptyConfigurePhase(
  def: ToolWizardDefinition,
  phaseId: ToolWizardPhaseId | undefined,
): boolean {
  return phaseId === "configure" && def.configureSteps.length === 0;
}

export function advancePhaseNavState(
  def: ToolWizardDefinition,
  state: PhaseNavState,
): PhaseNavState {
  const phaseId = def.phases[state.phaseIndex];
  if (phaseId === "configure" && state.configureIndex < def.configureSteps.length - 1) {
    return { ...state, configureIndex: state.configureIndex + 1 };
  }

  let nextPhaseIndex = state.phaseIndex + 1;
  while (nextPhaseIndex < def.phases.length) {
    const nextPhaseId = def.phases[nextPhaseIndex];
    if (isEmptyConfigurePhase(def, nextPhaseId)) {
      nextPhaseIndex += 1;
      continue;
    }
    return { phaseIndex: nextPhaseIndex, configureIndex: 0 };
  }

  return state;
}

export function retreatPhaseNavState(
  def: ToolWizardDefinition,
  state: PhaseNavState,
): PhaseNavState {
  const phaseId = def.phases[state.phaseIndex];
  if (phaseId === "configure" && state.configureIndex > 0) {
    return { ...state, configureIndex: state.configureIndex - 1 };
  }

  let prevPhaseIndex = state.phaseIndex - 1;
  while (prevPhaseIndex >= 0) {
    const prevPhaseId = def.phases[prevPhaseIndex];
    if (isEmptyConfigurePhase(def, prevPhaseId)) {
      prevPhaseIndex -= 1;
      continue;
    }
    const configureIndex =
      prevPhaseId === "configure"
        ? Math.max(def.configureSteps.length - 1, 0)
        : 0;
    return { phaseIndex: prevPhaseIndex, configureIndex };
  }

  return initialPhaseNavState(def);
}

export function resolvePhaseId(
  def: ToolWizardDefinition,
  state: PhaseNavState,
): ToolWizardPhaseId {
  return def.phases[state.phaseIndex] ?? def.startsOn;
}

export function resolveWizardStepId(
  def: ToolWizardDefinition,
  state: PhaseNavState,
): string {
  const phaseId = resolvePhaseId(def, state);
  if (phaseId === "place" || phaseId === "ask") {
    return phaseId;
  }
  return def.configureSteps[state.configureIndex]?.id ?? "configure";
}

export function completePhaseIds(
  def: ToolWizardDefinition,
  state: PhaseNavState,
): ToolWizardPhaseId[] {
  return def.phases.slice(0, state.phaseIndex);
}
