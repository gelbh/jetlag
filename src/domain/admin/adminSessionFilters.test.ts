import { describe, expect, it } from "vitest";
import {
  filterAdminSessions,
  summarizeAdminSessions,
} from "./adminSessionFilters";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

function summary(
  overrides: Partial<AdminSessionSummary> = {},
): AdminSessionSummary {
  return {
    sessionId: "session-1",
    code: "ABCD",
    hostUid: "host-1",
    tier: "free",
    gameSize: "medium",
    createdAt: "2026-01-01T00:00:00.000Z",
    memberCount: 2,
    roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    endGameStartedAt: null,
    endGameRequestedAt: null,
    hostAppVersion: null,
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: "Dublin",
    phase: "seek",
    lastActivityAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("adminSessionFilters", () => {
  it("filters by query, phase, and multiplayer", () => {
    const sessions = [
      summary({ sessionId: "a", code: "ABCD", phase: "seek", memberCount: 2 }),
      summary({
        sessionId: "b",
        code: "WXYZ",
        phase: "waiting",
        memberCount: 1,
        gameAreaLabel: "Cork",
      }),
    ];

    expect(
      filterAdminSessions(sessions, {
        query: "dub",
        phase: "seek",
        multiplayerOnly: true,
      }),
    ).toEqual([sessions[0]]);
  });

  it("summarizes live and phase counts", () => {
    const stats = summarizeAdminSessions([
      summary({ phase: "seek", memberCount: 2 }),
      summary({ phase: "end-game-active", memberCount: 1 }),
    ]);

    expect(stats.live).toBe(2);
    expect(stats.multiplayer).toBe(1);
    expect(stats.byPhase.seek).toBe(1);
    expect(stats.byPhase["end-game-active"]).toBe(1);
  });
});
