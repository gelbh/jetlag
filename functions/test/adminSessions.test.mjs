import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpsError } from "firebase-functions/v2/https";
import {
  deriveSessionPhase,
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
    });

    assert.equal(summary.code, "ABCD");
    assert.equal(summary.roleCounts.seeker, 1);
    assert.equal(summary.roleCounts.hider, 1);
    assert.equal(summary.roleCounts.observer, 1);
    assert.equal(summary.phase, "waiting");
    assert.equal(summary.tier, "premium");
  });
});
