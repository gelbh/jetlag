import { describe, expect, it } from "vitest";
import {
  MOTION_MAP_CAMERA_FLY_MS,
  MOTION_MAP_CAMERA_MS,
} from "../device/motion/motionTokens";
import { choosePlacementCameraMotion } from "./choosePlacementCameraMotion";

describe("choosePlacementCameraMotion", () => {
  it("uses fly duration token for a large jump when motion is allowed", () => {
    expect(
      choosePlacementCameraMotion({ animate: true, isLargeJump: true }),
    ).toEqual({
      kind: "fly",
      durationMs: MOTION_MAP_CAMERA_FLY_MS,
    });
  });

  it("uses ease duration token for a small jump when motion is allowed", () => {
    expect(
      choosePlacementCameraMotion({ animate: true, isLargeJump: false }),
    ).toEqual({
      kind: "ease",
      durationMs: MOTION_MAP_CAMERA_MS,
    });
  });

  it("jumps with no cinematic duration when motion is disabled", () => {
    expect(
      choosePlacementCameraMotion({ animate: false, isLargeJump: true }),
    ).toEqual({ kind: "jump" });
    expect(
      choosePlacementCameraMotion({ animate: false, isLargeJump: false }),
    ).toEqual({ kind: "jump" });
  });
});
