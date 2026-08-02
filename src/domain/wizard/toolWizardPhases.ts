export type ToolWizardPhaseId = "place" | "configure" | "ask";

export type ToolWizardAskMode = "ask" | "send" | "confirm";

/**
 * Frozen phase spine for tool wizards. Configure continua here are the
 * migration target; legacy per-tool step arrays in shared wizard utils stay
 * until panel migration re-exports from these defs.
 */
export type ToolWizardDefinition = {
  toolId: string;
  phases: readonly ToolWizardPhaseId[];
  configureSteps: readonly { id: string; label: string }[];
  askMode: ToolWizardAskMode;
  startsOn: ToolWizardPhaseId;
};

const SEEKER_PHASES = ["place", "configure", "ask"] as const satisfies readonly ToolWizardPhaseId[];

function seekerWizard(
  toolId: string,
  configureSteps: readonly { id: string; label: string }[],
): ToolWizardDefinition {
  return {
    toolId,
    phases: SEEKER_PHASES,
    configureSteps,
    askMode: "ask",
    startsOn: "place",
  };
}

export const RADAR_WIZARD = seekerWizard("radar", [
  { id: "distance", label: "Distance" },
]);

export const THERMOMETER_WIZARD = seekerWizard("thermometer", [
  { id: "distance", label: "Distance" },
]);

export const MATCHING_WIZARD = seekerWizard("matching", [
  { id: "category", label: "Category" },
  { id: "resolve", label: "Feature" },
]);

export const TENTACLE_WIZARD = seekerWizard("tentacle", [
  { id: "category", label: "Category" },
  { id: "locations", label: "Locations" },
]);

export const MEASURING_WIZARD = seekerWizard("measuring", [
  { id: "source", label: "Question" },
  { id: "target", label: "Target" },
]);

/** Create: Method → Place → Confirm (starts on Configure). */
export const HIDING_ZONE_CREATE_WIZARD: ToolWizardDefinition = {
  toolId: "hiding-zone-create",
  phases: ["configure", "place", "ask"],
  configureSteps: [{ id: "method", label: "Method" }],
  askMode: "confirm",
  startsOn: "configure",
};

/** Move: Place → Confirm only. */
export const HIDING_ZONE_MOVE_WIZARD: ToolWizardDefinition = {
  toolId: "hiding-zone-move",
  phases: ["place", "ask"],
  configureSteps: [],
  askMode: "confirm",
  startsOn: "place",
};

const PHASE_BASE_LABELS: Record<ToolWizardPhaseId, string> = {
  place: "Place",
  configure: "Configure",
  ask: "Ask",
};

function askPhaseLabel(mode: ToolWizardAskMode): string {
  switch (mode) {
    case "ask":
      return "Ask";
    case "send":
      return "Send";
    case "confirm":
      return "Confirm";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function resolveAskMode(
  def: ToolWizardDefinition,
  awaitHiderAnswer: boolean,
): ToolWizardAskMode {
  if (def.askMode === "confirm") {
    return "confirm";
  }
  if (awaitHiderAnswer) {
    return "send";
  }
  return "ask";
}

export function phaseRailLabels(
  def: ToolWizardDefinition,
  awaitHiderAnswer: boolean,
): { id: ToolWizardPhaseId; label: string }[] {
  const askMode = resolveAskMode(def, awaitHiderAnswer);
  return def.phases.map((id) => ({
    id,
    label: id === "ask" ? askPhaseLabel(askMode) : PHASE_BASE_LABELS[id],
  }));
}

export function primaryFooterLabel(input: {
  phase: ToolWizardPhaseId;
  askMode: ToolWizardAskMode;
  isSubmitting: boolean;
  toolCommitLabel: string;
}): string {
  if (input.phase !== "ask") {
    return "Continue";
  }
  if (input.isSubmitting) {
    switch (input.askMode) {
      case "send":
        return "Sending…";
      case "confirm":
        return "Confirming…";
      case "ask":
        return "Adding…";
      default: {
        const _exhaustive: never = input.askMode;
        return _exhaustive;
      }
    }
  }
  return input.toolCommitLabel;
}
