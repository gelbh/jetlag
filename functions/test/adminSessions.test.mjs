import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  compareSessionsByLastActivity,
  deriveSessionPhase,
  parseFirestoreTimestampMs,
  resolveSessionLastActivityMs,
  summarizeSession,
} from "../admin/listActiveSessions.mjs";
import {
  isAdminAuth,
  requireAdminAuth,
} from "../admin/adminAccess.mjs";

describe("adminAccess", () => {
  it("accepts verified admin email", () => {
    assert.equal(
      isAdminAuth({
        token: {
          email: "gelbharttomer@gmail.com",
          email_verified: true,
        },
      }),
      true,
    );
  });

  it("rejects unverified or wrong email", () => {
    assert.equal(
      isAdminAuth({
        token: {
          email: "gelbharttomer@gmail.com",
          email_verified: false,
        },
      }),
      false,
    );
    assert.equal(
      isAdminAuth({
        token: {
          email: "other@example.com",
          email_verified: true,
        },
      }),
      false,
    );
  });

  it("requireAdminAuth throws for non-admin", () => {
    assert.throws(
      () =>
        requireAdminAuth({
          token: {
            email: "other@example.com",
            email_verified: true,
          },
        }),
      (error) => {
        assert.ok(error instanceof HttpsError);
        assert.equal(error.code, "permission-denied");
        return true;
      },
    );
  });
});

describe("listActiveSessions helpers", () => {
  it("derives session phase from timer and end-game flags", () => {
    assert.equal(
      deriveSessionPhase({
        gameSize: "medium",
        timerAccumulatedMs: 0,
        timerRunningSince: null,
      }),
      "waiting",
    );
    assert.equal(
      deriveSessionPhase(
        {
          gameSize: "medium",
          timerAccumulatedMs: 5 * 60_000,
          timerRunningSince: null,
        },
        Date.parse("2026-01-01T00:10:00.000Z"),
      ),
      "hiding",
    );
    assert.equal(
      deriveSessionPhase({
        gameSize: "medium",
        timerAccumulatedMs: 90 * 60_000,
        timerRunningSince: null,
      }),
      "seek",
    );
    assert.equal(
      deriveSessionPhase({
        gameSize: "medium",
        endGameRequestedAt: "2026-01-01T01:00:00.000Z",
      }),
      "end-game-pending",
    );
    assert.equal(
      deriveSessionPhase({
        gameSize: "medium",
        endGameStartedAt: "2026-01-01T01:05:00.000Z",
      }),
      "end-game-active",
    );
  });

  it("summarizes role counts and phase", () => {
    const summary = summarizeSession("session-1", "ABCD", {
      hostUid: "host-1",
      tier: "premium",
      gameSize: "large",
      createdAt: "2026-01-01T00:00:00.000Z",
      memberUids: ["host-1", "hider-1", "observer-1"],
      memberRoles: {
        "host-1": "seeker",
        "hider-1": "hider",
        "observer-1": "observer",
      },
      timerAccumulatedMs: 0,
      timerRunningSince: null,
      hostAppVersion: "1.2.3",
      gameAreaLabel: "Dublin",
    });

    assert.equal(summary.code, "ABCD");
    assert.equal(summary.roleCounts.seeker, 1);
    assert.equal(summary.roleCounts.hider, 1);
    assert.equal(summary.roleCounts.observer, 1);
    assert.equal(summary.phase, "waiting");
    assert.equal(summary.tier, "premium");
    assert.equal(summary.regionPackId, null);
    assert.equal(summary.gameAreaLabel, "Dublin");
    assert.equal(summary.lastActivityAt, null);
  });

  it("parses ISO strings and Firestore timestamp shapes", () => {
    assert.equal(
      parseFirestoreTimestampMs("2026-01-01T12:00:00.000Z"),
      Date.parse("2026-01-01T12:00:00.000Z"),
    );
    assert.equal(
      parseFirestoreTimestampMs(
        Timestamp.fromMillis(Date.parse("2026-01-02T00:00:00.000Z")),
      ),
      Date.parse("2026-01-02T00:00:00.000Z"),
    );
    assert.equal(
      parseFirestoreTimestampMs({ seconds: 1_735_689_600, nanoseconds: 500_000_000 }),
      1_735_689_600_500,
    );
    assert.equal(parseFirestoreTimestampMs("not-a-date"), null);
    assert.equal(parseFirestoreTimestampMs(null), null);
  });

  it("resolves last activity from session fields and latest subcollection events", () => {
    const session = {
      createdAt: "2026-01-01T00:00:00.000Z",
      timerRunningSince: "2026-01-01T01:00:00.000Z",
      endGameRequestedAt: "2026-01-01T02:00:00.000Z",
      sessionResetAt: "2026-01-01T03:00:00.000Z",
    };

    assert.equal(
      resolveSessionLastActivityMs(session, {
        annotationDoc: { updatedAt: "2026-01-01T04:00:00.000Z" },
        messageDoc: { createdAt: "2026-01-01T05:00:00.000Z" },
        questionDoc: { createdAt: "2026-01-01T02:30:00.000Z" },
      }),
      Date.parse("2026-01-01T05:00:00.000Z"),
    );
  });

  it("sorts sessions by lastActivityAt desc with createdAt tiebreaker", () => {
    const sessions = [
      {
        sessionId: "older-activity",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastActivityAt: "2026-01-01T01:00:00.000Z",
      },
      {
        sessionId: "newer-activity",
        createdAt: "2025-12-31T00:00:00.000Z",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
      },
      {
        sessionId: "tie-activity-newer-created",
        createdAt: "2026-01-03T00:00:00.000Z",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
      },
      {
        sessionId: "missing-activity",
        createdAt: "2026-01-04T00:00:00.000Z",
        lastActivityAt: null,
      },
    ];

    const sorted = [...sessions].sort(compareSessionsByLastActivity);
    assert.deepEqual(
      sorted.map((session) => session.sessionId),
      [
        "tie-activity-newer-created",
        "newer-activity",
        "older-activity",
        "missing-activity",
      ],
    );
  });
});
