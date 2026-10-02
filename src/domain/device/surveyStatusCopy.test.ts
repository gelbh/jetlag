import { describe, expect, it } from "vitest";
import { resolveHidingPeriodMs } from "@/domain/session/rules";
import {
  mapIslandSessionStatus,
  mapIslandSessionStatusCompact,
  surveyPhaseLabel,
  surveySyncSegmentLabel,
  surveySyncShortLabel,
} from "./surveyStatusCopy";

const rules = { gameSize: "medium" as const };
const timer = {
  accumulatedMs: 0,
  runningSince: null as number | null,
};
const hidingPeriodMs = resolveHidingPeriodMs(rules);

describe("surveyPhaseLabel", () => {
  it("returns dash before the game starts", () => {
    expect(surveyPhaseLabel(false, rules, timer, false)).toBe("—");
  });

  it("returns Moving when a hide move is in progress", () => {
    expect(surveyPhaseLabel(true, rules, timer, true)).toBe("Moving");
  });

  it("returns Hiding during the hiding period", () => {
    expect(
      surveyPhaseLabel(true, rules, { accumulatedMs: 30_000, runningSince: null }, false),
    ).toBe("Hiding");
  });

  it("returns Seeking after the hiding period", () => {
    expect(
      surveyPhaseLabel(true, rules, { accumulatedMs: 3_600_000, runningSince: null }, false),
    ).toBe("Seeking");
  });

  it("flips from Hiding to Seeking at the hiding-period boundary", () => {
    expect(
      surveyPhaseLabel(
        true,
        rules,
        { accumulatedMs: hidingPeriodMs - 1, runningSince: null },
        false,
      ),
    ).toBe("Hiding");
    expect(
      surveyPhaseLabel(true, rules, { accumulatedMs: hidingPeriodMs, runningSince: null }, false),
    ).toBe("Seeking");
  });
});

describe("mapIslandSessionStatus", () => {
  it("prefers lobby states before start", () => {
    expect(
      mapIslandSessionStatus({
        timerHasStarted: false,
        timerSyncing: true,
        timerRunning: false,
        canStartGame: true,
        moveInProgress: false,
        sessionRules: rules,
        timerState: timer,
      }),
    ).toBe("Syncing");
    expect(
      mapIslandSessionStatus({
        timerHasStarted: false,
        timerSyncing: false,
        timerRunning: false,
        canStartGame: true,
        moveInProgress: false,
        sessionRules: rules,
        timerState: timer,
      }),
    ).toBe("Ready");
    expect(
      mapIslandSessionStatus({
        timerHasStarted: false,
        timerSyncing: false,
        timerRunning: false,
        canStartGame: false,
        moveInProgress: false,
        sessionRules: rules,
        timerState: timer,
      }),
    ).toBe("Waiting");
  });

  it("prefers Walking over phase when a thermometer walk is live", () => {
    expect(
      mapIslandSessionStatus({
        timerHasStarted: true,
        timerSyncing: false,
        timerRunning: true,
        canStartGame: false,
        moveInProgress: false,
        sessionRules: rules,
        timerState: { accumulatedMs: 30_000, runningSince: Date.now() },
        pendingQuestions: [
          {
            id: "pq-walk",
            sessionId: "s",
            toolType: "thermometer",
            createdByUid: "u",
            createdAt: new Date().toISOString(),
            status: "walking",
            placement: { geometryJson: "{}", metadata: {} },
            replyOptions: [],
            promptText: "Walk",
          },
        ],
      }),
    ).toBe("Walking");
  });

  it("returns Paused when the session clock is stopped", () => {
    expect(
      mapIslandSessionStatus({
        timerHasStarted: true,
        timerSyncing: false,
        timerRunning: false,
        canStartGame: false,
        moveInProgress: false,
        sessionRules: rules,
        timerState: { accumulatedMs: 30_000, runningSince: null },
      }),
    ).toBe("Paused");
  });

  it("compacts long labels for narrow islands", () => {
    expect(mapIslandSessionStatusCompact("Seeking")).toBe("Seek");
    expect(mapIslandSessionStatusCompact("Walking")).toBe("Walk");
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

describe("surveySyncSegmentLabel", () => {
  it("hides synced copy and shortens offline/error", () => {
    expect(surveySyncSegmentLabel("synced", 0)).toBeNull();
    expect(surveySyncSegmentLabel("offline", 3)).toBe("Off · 3");
    expect(surveySyncSegmentLabel("error", 0)).toBe("Issue");
  });
});
