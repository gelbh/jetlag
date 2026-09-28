import { describe, expect, it } from "vitest";
import { splitRoundPhaseMs } from "./splitRoundPhaseMs";

describe("splitRoundPhaseMs", () => {
  it("splits past the hide period", () => {
    expect(splitRoundPhaseMs(3_900_000, 3_600_000)).toEqual({
      hidingPhaseMs: 3_600_000,
      seekPhaseMs: 300_000,
    });
  });

  it("keeps entire duration in hide when ended early", () => {
    expect(splitRoundPhaseMs(120_000, 3_600_000)).toEqual({
      hidingPhaseMs: 120_000,
      seekPhaseMs: 0,
    });
  });

  it("clamps negative duration to zeros", () => {
    expect(splitRoundPhaseMs(-1, 3_600_000)).toEqual({
      hidingPhaseMs: 0,
      seekPhaseMs: 0,
    });
  });
});
