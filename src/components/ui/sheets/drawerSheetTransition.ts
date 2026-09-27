import { MOTION_SHEET_PRESENT_MS } from "@/domain/device/motion/motionTokens";

/** Mantine Drawer enter/exit mapped to sheet motion tokens (Verify #4). */
export function resolveDrawerSheetTransitionProps(decorativeAnimate: boolean) {
  return {
    duration: decorativeAnimate ? MOTION_SHEET_PRESENT_MS : 0,
    timingFunction: "var(--ease-ios-standard)",
  } as const;
}
