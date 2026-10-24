import { describe, expect, it } from "vitest";
import {
  CAPTURE_CONFIRM_TIMEOUT_MS,
  confirmSiegeCapture,
  createIdleSiegeCapture,
  disputeSiegeCapture,
  isCaptureWin,
  resolveSiegeCaptureTimeout,
  submitSiegeCapture,
} from "./siegeCapture";
import { createSiegeClocks, pauseSiegeClock } from "./siegeClocks";
import { createInitialSiegeGuards } from "./siegeGuards";

describe("siegeCapture", () => {
  it("rejects submit when capture is blocked", () => {
    const clock = pauseSiegeClock(
      createSiegeClocks({
        nowMs: 0,
        limitSeconds: 600,
        endgame: { kind: "standard", attackingTeam: "teamA" },
      }),
      1_000,
      "geofence",
    );
    const result = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 2_000,
      attackingTeamId: "teamA",
      submittedByUid: "uid-a",
      photoStoragePath: "sessions/s1/siegeCaptures/a.jpg",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("capture_blocked");
    }
  });

  it("submit → confirm ends game for attackers (V10)", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "standard", attackingTeam: "teamA" },
    });
    const submitted = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 10_000,
      attackingTeamId: "teamA",
      submittedByUid: "uid-a",
      photoStoragePath: "sessions/s1/siegeCaptures/a.jpg",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }
    expect(submitted.capture.status).toBe("pending");
    expect(submitted.capture.confirmDeadlineMs).toBe(10_000 + CAPTURE_CONFIRM_TIMEOUT_MS);

    const confirmed = confirmSiegeCapture({
      capture: submitted.capture,
      nowMs: 20_000,
      resolvedByUid: "uid-b",
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) {
      return;
    }
    expect(confirmed.capture.status).toBe("confirmed");
    expect(isCaptureWin(confirmed.capture)).toBe(true);
  });

  it("timeout without confirm counts as attacker win (V10)", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    const submitted = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 0,
      attackingTeamId: "teamB",
      submittedByUid: "uid-b",
      photoStoragePath: "sessions/s1/siegeCaptures/b.jpg",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }
    const timed = resolveSiegeCaptureTimeout(submitted.capture, CAPTURE_CONFIRM_TIMEOUT_MS + 1);
    expect(timed.ok).toBe(true);
    if (!timed.ok) {
      return;
    }
    expect(timed.capture.status).toBe("timeout");
    expect(isCaptureWin(timed.capture)).toBe(true);
  });

  it("dispute pauses clock and does not win yet", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "standard", attackingTeam: "teamA" },
    });
    const submitted = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 0,
      attackingTeamId: "teamA",
      submittedByUid: "uid-a",
      photoStoragePath: "sessions/s1/siegeCaptures/a.jpg",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }
    const disputed = disputeSiegeCapture({
      capture: submitted.capture,
      clock,
      nowMs: 5_000,
      resolvedByUid: "uid-b",
    });
    expect(disputed.ok).toBe(true);
    if (!disputed.ok) {
      return;
    }
    expect(disputed.capture.status).toBe("disputed");
    expect(disputed.clock.paused).toBe(true);
    expect(disputed.clock.pauseReason).toBe("dispute");
    expect(isCaptureWin(disputed.capture)).toBe(false);
  });

  it("rejects second submit while pending", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    const first = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 0,
      attackingTeamId: "teamA",
      submittedByUid: "uid-a",
      photoStoragePath: "sessions/s1/siegeCaptures/a.jpg",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = submitSiegeCapture({
      capture: first.capture,
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 1_000,
      attackingTeamId: "teamB",
      submittedByUid: "uid-b",
      photoStoragePath: "sessions/s1/siegeCaptures/b.jpg",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("already_pending");
    }
  });
});
