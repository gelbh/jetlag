import { describe, expect, it } from "vitest";
import {
  surveyPhaseLabel,
  surveySyncShortLabel,
} from "./surveyStatusCopy";

const rules = { gameSize: "medium" as const };
const timer = {
  accumulatedMs: 0,
  runningSince: null,
};

describe("surveyPhaseLabel", () => {
  it("returns dash before the game starts", () => {
    expect(surveyPhaseLabel(false, rules, timer, false)).toBe("—");
  });

  it("returns Moving when a hide move is in progress", () => {
    expect(surveyPhaseLabel(true, rules, timer, true)).toBe("Moving");
  });
});

describe("surveySyncShortLabel", () => {
  it("labels synced without relying on color alone", () => {
    expect(surveySyncShortLabel("synced", 0)).toBe("Synced");
  });

  it("includes queue count when offline", () => {
    expect(surveySyncShortLabel("offline", 2)).toBe("Offline · 2 queued");
  });
});
