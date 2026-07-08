import type { ToolStep, ToolStepState } from "./ToolStepper";

export type ToolStepDefinition = { id: string; label: string };

export function deriveStepStates(
  stepCount: number,
  currentIndex: number,
): ToolStepState[] {
  return Array.from({ length: stepCount }, (_, index) => {
    if (index === currentIndex) {
      return "current";
    }
    if (index < currentIndex) {
      return "complete";
    }
    return "upcoming";
  });
}

export function buildSteps(
  labels: readonly { id: string; label: string }[],
  states: readonly ToolStepState[],
): ToolStep[] {
  return labels.map((item, index) => ({
    id: item.id,
    label: item.label,
    state: states[index] ?? "upcoming",
  }));
}

export const MATCHING_STEPS = [
  { id: "anchor", label: "Anchor" },
  { id: "category", label: "Category" },
  { id: "resolve", label: "Feature" },
  { id: "answer", label: "Answer" },
] as const;

export const RADAR_STEPS = [
  { id: "anchor", label: "Anchor" },
  { id: "distance", label: "Distance" },
  { id: "answer", label: "Answer" },
] as const;

export const THERMOMETER_STEPS = [
  { id: "distance", label: "Distance" },
  { id: "placement", label: "Anchor" },
  { id: "answer", label: "Answer" },
] as const;

export const TENTACLE_STEPS = [
  { id: "anchor", label: "Anchor" },
  { id: "category", label: "Category" },
  { id: "locations", label: "Locations" },
  { id: "answer", label: "Answer" },
] as const;

export const MEASURING_STEPS = [
  { id: "anchor", label: "Anchor" },
  { id: "source", label: "Question" },
  { id: "target", label: "Target" },
  { id: "answer", label: "Answer" },
] as const;

/** Multiplayer drops the Answer step; hiders respond in game chat. */
export function stepsForMode<T extends readonly ToolStepDefinition[]>(
  allSteps: T,
  awaitHiderAnswer: boolean,
): readonly ToolStepDefinition[] {
  if (!awaitHiderAnswer) {
    return allSteps;
  }

  return allSteps.filter((step) => step.id !== "answer");
}
