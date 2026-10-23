import type { AdminSessionSummary } from "@/services/admin/adminSessions";

export function makeSession(overrides: Partial<AdminSessionSummary> = {}): AdminSessionSummary {
  return {
    sessionId: "s1",
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
    hostAppVersion: "1.4.1",
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: "Dublin",
    phase: "seek",
    lastActivityAt: null,
    lastLocationAt: null,
    lastAnnotationAt: null,
    activeAnnotationCount: 0,
    mode: "multiplayer",
    isLive: true,
    liveMultiplayer: true,
    ...overrides,
  };
}
