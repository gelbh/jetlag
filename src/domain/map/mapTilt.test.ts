import { describe, expect, it } from "vitest";
import {
  MAP_TILT_FIT_BOUNDS_TOP_BIAS_PX,
  mapTiltFitBoundsPadding,
  mapTiltCssVariables,
} from "./mapTilt";

describe("mapTilt", () => {
  it("exports css variables from domain constants", () => {
    expect(mapTiltCssVariables()).toEqual({
      "--map-tilt-perspective": "1400px",
      "--map-tilt-rotate-x": "12deg",
      "--map-tilt-rotate-z": "-1.5deg",
    });
  });

  it("adds top fitBounds padding only when tilt is active", () => {
    expect(mapTiltFitBoundsPadding([32, 32], "flat")).toEqual([32, 32]);
    expect(mapTiltFitBoundsPadding([32, 32], "tilted")).toEqual([
      32 + MAP_TILT_FIT_BOUNDS_TOP_BIAS_PX,
      32,
    ]);
  });
});
