import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "../state/sessionStore";
import { useTimerStore } from "../state/timerStore";
import { resetAllStores } from "../test/helpers/storeReset";
import {
  clearSessionLocalArtifacts,
  pruneStaleTimerSessions,
} from "./sessionCleanup";

describe("sessionCleanup", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("clears timer and offline queue artifacts for a session", async () => {
    useTimerStore.getState().setTimer("session-1", {
      accumulatedMs: 1000,
      runningSince: null,
    });

    await clearSessionLocalArtifacts("session-1");

    expect(useTimerStore.getState().getTimer("session-1")).toEqual({
      accumulatedMs: 0,
      runningSince: null,
    });
  });

  it("prunes timers for sessions other than the active one", () => {
    useSessionStore.getState().setSession({
      id: "active-session",
      code: "ABCD",
      gameArea: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      memberUids: [],
    });
    useTimerStore.getState().setTimer("active-session", {
      accumulatedMs: 0,
      runningSince: null,
    });
    useTimerStore.getState().setTimer("stale-session", {
      accumulatedMs: 500,
      runningSince: null,
    });

    pruneStaleTimerSessions();

    expect(useTimerStore.getState().bySessionId["stale-session"]).toBeUndefined();
    expect(useTimerStore.getState().bySessionId["active-session"]).toBeDefined();
  });
});
