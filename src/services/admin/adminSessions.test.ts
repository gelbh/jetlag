import { describe, expect, it, vi } from "vitest";
import {
  fetchActiveAdminSessions,
  fetchAdminSessionsPage,
  type AdminSessionSummary,
} from "./adminSessions";

const mockCallable = vi.fn();

vi.mock("../core/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseFunctions: async () => ({}),
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => mockCallable,
}));

function sessionSummary(
  overrides: Pick<AdminSessionSummary, "sessionId" | "lastActivityAt" | "createdAt">,
): AdminSessionSummary {
  return {
    sessionId: overrides.sessionId,
    code: overrides.sessionId,
    hostUid: null,
    tier: "free",
    gameSize: "small",
    createdAt: overrides.createdAt,
    memberCount: 1,
    roleCounts: { seeker: 1, hider: 0, observer: 0, admin: 0 },
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    endGameStartedAt: null,
    endGameRequestedAt: null,
    hostAppVersion: null,
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: null,
    phase: "waiting",
    lastActivityAt: overrides.lastActivityAt,
    lastLocationAt: null,
    mode: "singleplayer",
    isLive: false,
    liveMultiplayer: false,
  };
}

describe("fetchActiveAdminSessions", () => {
  it("sorts merged pages globally by last activity", async () => {
    mockCallable
      .mockResolvedValueOnce({
        data: {
          sessions: [
            sessionSummary({
              sessionId: "older-page",
              lastActivityAt: "2026-01-02T00:00:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ],
          nextPageToken: "page-2",
        },
      })
      .mockResolvedValueOnce({
        data: {
          sessions: [
            sessionSummary({
              sessionId: "newer-page",
              lastActivityAt: "2026-01-03T00:00:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ],
          nextPageToken: null,
        },
      });

    const sessions = await fetchActiveAdminSessions();

    expect(sessions.map((session) => session.sessionId)).toEqual([
      "newer-page",
      "older-page",
    ]);
  });
});

describe("fetchAdminSessionsPage", () => {
  it("forwards page token and limit to the callable", async () => {
    mockCallable.mockResolvedValueOnce({
      data: {
        sessions: [
          sessionSummary({
            sessionId: "page-1",
            lastActivityAt: "2026-01-02T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
          }),
        ],
        nextPageToken: "page-2",
      },
    });

    const page = await fetchAdminSessionsPage(null, 25);

    expect(mockCallable).toHaveBeenCalledWith({
      limit: 25,
      pageToken: null,
    });
    expect(page.sessions).toHaveLength(1);
    expect(page.nextPageToken).toBe("page-2");
  });

  it("returns a terminal page when nextPageToken is null", async () => {
    mockCallable.mockResolvedValueOnce({
      data: {
        sessions: [],
        nextPageToken: null,
      },
    });

    const page = await fetchAdminSessionsPage("page-2");

    expect(mockCallable).toHaveBeenCalledWith({
      limit: 50,
      pageToken: "page-2",
    });
    expect(page.nextPageToken).toBeNull();
  });
});
