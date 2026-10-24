import { MOTION_MAP_CAMERA_FLY_MS, MOTION_MAP_CAMERA_MS } from "../device/motion/motionTokens";

export type PlacementCameraMotion =
  | { kind: "jump" }
  | { kind: "fly"; durationMs: number }
  | { kind: "ease"; durationMs: number };

export function choosePlacementCameraMotion(args: {
  animate: boolean;
  isLargeJump: boolean;
}): PlacementCameraMotion {
  if (!args.animate) {
    return { kind: "jump" };
  }
  if (args.isLargeJump) {
    return { kind: "fly", durationMs: MOTION_MAP_CAMERA_FLY_MS };
  }
  return { kind: "ease", durationMs: MOTION_MAP_CAMERA_MS };
}
