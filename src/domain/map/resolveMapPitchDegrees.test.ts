import { describe, expect, it } from "vitest";
import {
  MAP_PITCH_MAX_DEGREES,
  resolveMapPitchDegrees,
} from "./resolveMapPitchDegrees";

describe("resolveMapPitchDegrees", () => {
  it("returns 0 when pitch is disabled", () => {
    expect(resolveMapPitchDegrees(false, false)).toBe(0);
  });

  it("returns 0 when low-power is on even if pitch is enabled", () => {
    expect(resolveMapPitchDegrees(true, true)).toBe(0);
  });

  it("returns 0 when both disabled and low-power", () => {
    expect(resolveMapPitchDegrees(false, true)).toBe(0);
  });

  it("returns the allowed max pitch when enabled and not low-power", () => {
    expect(resolveMapPitchDegrees(true, false)).toBe(MAP_PITCH_MAX_DEGREES);
    expect(MAP_PITCH_MAX_DEGREES).toBe(60);
  });
});
