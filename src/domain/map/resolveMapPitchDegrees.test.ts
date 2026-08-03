import { describe, expect, it } from "vitest";
import {
  MAP_PITCH_MAX_DEGREES,
  resolveMapPitchDegrees,
} from "./resolveMapPitchDegrees";

describe("resolveMapPitchDegrees", () => {
  it("returns 0 when low-power is on", () => {
    expect(resolveMapPitchDegrees(true)).toBe(0);
  });

  it("returns the allowed max pitch when not low-power", () => {
    expect(resolveMapPitchDegrees(false)).toBe(MAP_PITCH_MAX_DEGREES);
    expect(MAP_PITCH_MAX_DEGREES).toBe(60);
  });
});
