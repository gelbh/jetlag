/** layoutId registry for framer-enhanced shared-element transitions (Phase 9). */
export const MOTION_SHARED_ELEMENTS = {
  toolDockSlot: "motion-tool-dock-slot",
  sheetHeader: "motion-sheet-header",
  questionRow: "motion-question-row",
  presetCardTitle: "motion-preset-card-title",
} as const;

export type MotionSharedElementId =
  (typeof MOTION_SHARED_ELEMENTS)[keyof typeof MOTION_SHARED_ELEMENTS];
