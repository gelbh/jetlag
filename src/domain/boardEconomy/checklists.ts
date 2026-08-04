/** Rulebook honor-system checklist copy (no GPS enforce in v1). */

export const FOUND_CHECKLIST_ITEMS = [
  "Seekers are within 2 m of the hider and have spotted them.",
] as const;

export const END_GAME_CHECKLIST_ITEMS = [
  "Seekers have entered the hiding zone.",
  "Seekers are off transit (disembarked; vehicle has left).",
  "Hider is in a publicly accessible hiding spot.",
  "Hiding spot is within 3 m of a marked path or road on the map app.",
] as const;

export function foundChecklistCopy(): string {
  return FOUND_CHECKLIST_ITEMS.map((item) => `• ${item}`).join("\n");
}

export function endGameChecklistCopy(): string {
  return END_GAME_CHECKLIST_ITEMS.map((item) => `• ${item}`).join("\n");
}
