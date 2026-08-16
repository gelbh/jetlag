import { describe, expect, it } from "vitest";
import {
  surveyPhaseLabel,
  surveySyncShortLabel,
} from "./surveyStatusCopy";

const rules = { gameSize: "medium" as const };
const timer = {
  accumulatedMs: 0,
  runningSince: null as number | null,
};

describe("surveyPhaseLabel", () => {
  it("returns dash before the game starts", () => {
    expect(surveyPhaseLabel(false, rules, timer, false)).toBe("—");
  });

  it("returns Moving when a hide move is in progress", () => {
    expect(surveyPhaseLabel(true, rules, timer, true)).toBe("Moving");
  });

  it("returns Hiding during the hiding period", () => {
    expect(
      surveyPhaseLabel(
        true,
        rules,
        { accumulatedMs: 30_000, runningSince: null },
        false,
      ),
    ).toBe("Hiding");
  });

  it("returns Seeking after the hiding period", () => {
    expect(
      surveyPhaseLabel(
        true,
        rules,
        { accumulatedMs: 3_600_000, runningSince: null },
        false,
      ),
    ).toBe("Seeking");
  });
});

describe("surveySyncShortLabel", () => {
  it.each([
    ["synced", 0, "Synced"],
    ["saving", 0, "Saving…"],
    ["offline", 0, "Offline"],
    ["offline", 2, "Offline · 2 queued"],
    ["degraded", 0, "Unstable"],
    ["degraded", 3, "Unstable · 3 queued"],
    ["error", 0, "Sync issue"],
  ] as const)("%s queued=%i → %s", (status, queued, label) => {
    expect(surveySyncShortLabel(status, queued)).toBe(label);
  });
});
