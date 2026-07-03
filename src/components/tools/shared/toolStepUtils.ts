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
  { id: "category", label: "Category" },
  { id: "anchor", label: "Anchor" },
  { id: "resolve", label: "Feature" },
  { id: "answer", label: "Answer" },
] as const;

export const RADAR_STEPS = [
  { id: "distance", label: "Distance" },
  { id: "anchor", label: "Anchor" },
  { id: "answer", label: "Answer" },
] as const;

export const THERMOMETER_STEPS = [
  { id: "distance", label: "Distance" },
  { id: "placement", label: "Movement" },
  { id: "answer", label: "Answer" },
] as const;

export const TENTACLE_STEPS = [
  { id: "category", label: "Category" },
  { id: "anchor", label: "Anchor" },
  { id: "locations", label: "Locations" },
  { id: "answer", label: "Answer" },
] as const;

export const MEASURING_STEPS = [
  { id: "source", label: "Question" },
  { id: "anchor", label: "Anchor" },
  { id: "target", label: "Target" },
  { id: "answer", label: "Answer" },
] as const;
