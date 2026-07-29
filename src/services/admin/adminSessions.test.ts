import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import {
  fetchActiveAdminSessions,
  fetchAdminSessionsPage,
  type AdminSessionSummary,
} from "./adminSessions";

const { mockCallable, forceRefreshIdToken } = vi.hoisted(() => ({
  mockCallable: vi.fn(),
  forceRefreshIdToken: vi.fn(async () => undefined),
}));

vi.mock("../core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseFunctions: async () => ({}),
}));

vi.mock("../core/auth/forceRefreshIdToken", () => ({
  forceRefreshIdToken,
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
    lastAnnotationAt: null,
    activeAnnotationCount: 0,
    mode: "singleplayer",
    isLive: false,
    liveMultiplayer: false,
  };
}

describe("fetchActiveAdminSessions", () => {
  beforeEach(() => {
    mockCallable.mockReset();
    forceRefreshIdToken.mockClear();
  });

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
  beforeEach(() => {
    mockCallable.mockReset();
    forceRefreshIdToken.mockClear();
  });

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

  it("refreshes the ID token once after permission-denied then succeeds", async () => {
    mockCallable
      .mockRejectedValueOnce(
        new FirebaseError("functions/permission-denied", "Admin access required."),
      )
      .mockResolvedValueOnce({
        data: {
          sessions: [
            sessionSummary({
              sessionId: "recovered",
              lastActivityAt: "2026-01-02T00:00:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ],
          nextPageToken: null,
        },
      });

    const page = await fetchAdminSessionsPage();

    expect(forceRefreshIdToken).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledTimes(2);
    expect(page.sessions[0]?.sessionId).toBe("recovered");
  });

  it("maps double permission-denied to Admin access required", async () => {
    mockCallable.mockRejectedValue(
      new FirebaseError("functions/permission-denied", "nope"),
    );

    await expect(fetchAdminSessionsPage()).rejects.toThrow("Admin access required.");
    expect(forceRefreshIdToken).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });
});
