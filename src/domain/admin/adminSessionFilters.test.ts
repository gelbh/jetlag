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
    hostAppVersion: "0.5.14",
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: "Dublin",
    phase: "seek",
    lastActivityAt: "2026-01-02T00:00:00.000Z",
    lastLocationAt: "2026-01-02T00:00:00.000Z",
    mode: "multiplayer",
    isLive: true,
    liveMultiplayer: true,
    ...overrides,
  };
}

describe("adminSessionFilters", () => {
  it("filters by query, live toggle, mode, and state chips", () => {
    const sessions = [
      summary({ sessionId: "a", code: "ABCD", phase: "seek", isLive: true }),
      summary({
        sessionId: "b",
        code: "WXYZ",
        phase: "waiting",
        memberCount: 1,
        mode: "singleplayer",
        isLive: false,
        gameAreaLabel: "Cork",
      }),
    ];

    expect(
      filterAdminSessions(sessions, {
        query: "dub",
        liveOnly: true,
        mode: "multiplayer",
        state: "seek",
        sort: "lastActivity",
      }),
    ).toEqual([sessions[0]]);
  });

  it("matches host version in search", () => {
    const sessions = [summary({ hostAppVersion: "0.5.14" })];

    expect(
      filterAdminSessions(sessions, {
        query: "0.5.14",
        liveOnly: false,
        mode: "all",
        state: null,
        sort: "lastActivity",
      }),
    ).toEqual(sessions);
  });

  it("sorts by last location and created timestamps", () => {
    const sessions = [
      summary({
        sessionId: "older-location",
        lastLocationAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      summary({
        sessionId: "newer-location",
        lastLocationAt: "2026-01-03T00:00:00.000Z",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ];

    expect(
      filterAdminSessions(sessions, {
        query: "",
        liveOnly: false,
        mode: "all",
        state: null,
        sort: "lastLocation",
      }).map((entry) => entry.sessionId),
    ).toEqual(["newer-location", "older-location"]);

    expect(
      filterAdminSessions(sessions, {
        query: "",
        liveOnly: false,
        mode: "all",
        state: null,
        sort: "created",
      }).map((entry) => entry.sessionId),
    ).toEqual(["newer-location", "older-location"]);
  });

  it("filters end-game state chips across pending and active phases", () => {
    const sessions = [
      summary({ sessionId: "pending", phase: "end-game-pending" }),
      summary({ sessionId: "active", phase: "end-game-active" }),
      summary({ sessionId: "seek", phase: "seek" }),
    ];

    expect(
      filterAdminSessions(sessions, {
        query: "",
        liveOnly: false,
        mode: "all",
        state: "end-game",
        sort: "lastActivity",
      }).map((entry) => entry.sessionId),
    ).toEqual(["pending", "active"]);
  });

  it("summarizes live and phase counts", () => {
    const stats = summarizeAdminSessions([
      summary({ phase: "seek", isLive: true, mode: "multiplayer" }),
      summary({
        phase: "end-game-active",
        memberCount: 1,
        mode: "singleplayer",
        isLive: false,
      }),
    ]);

    expect(stats.live).toBe(1);
    expect(stats.multiplayer).toBe(1);
    expect(stats.byPhase.seek).toBe(1);
    expect(stats.byPhase["end-game-active"]).toBe(1);
  });
});
