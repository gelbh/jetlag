import { describe, expect, it } from "vitest";
import { mapLandscapeChipTimerLabel } from "./mapLandscapeChipTimerLabel";

describe("mapLandscapeChipTimerLabel", () => {
  it("returns ready label before the timer starts", () => {
    expect(
      mapLandscapeChipTimerLabel({
        sessionRules: { gameSize: "medium" },
        timerState: { runningSince: null, accumulatedMs: 0 },
        timerHasStarted: false,
      }),
    ).toEqual({ phase: "SESSION", value: "Ready" });
  });

  it("returns seek phase elapsed after hiding ends", () => {
    expect(
      mapLandscapeChipTimerLabel({
        sessionRules: { gameSize: "medium" },
        timerState: {
          runningSince: null,
          accumulatedMs: 4_000_000,
        },
        timerHasStarted: true,
      }).phase,
    ).toBe("SEEK");
  });
});
