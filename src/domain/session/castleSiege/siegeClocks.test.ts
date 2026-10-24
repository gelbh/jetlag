import { describe, expect, it } from "vitest";
import {
  createSiegeClocks,
  DUSK_HEAD_START_SECONDS,
  pauseSiegeClock,
  remainingSiegeMs,
  resumeSiegeClock,
  type SiegeEndgameStart,
} from "./siegeClocks";

const LIMIT = 90 * 60;

describe("siegeClocks", () => {
  it("defaults Dusk head-start to 15 minutes", () => {
    expect(DUSK_HEAD_START_SECONDS).toBe(15 * 60);
  });

  it("starts Dual Siege with both teams attacking and no head-start window", () => {
    const endgame: SiegeEndgameStart = { kind: "dualSiege" };
    const clock = createSiegeClocks({ nowMs: 1_000, limitSeconds: LIMIT, endgame });
    expect(clock.roles).toEqual({ teamA: "attack", teamB: "attack" });
    expect(clock.headStartTeamId).toBeNull();
    expect(clock.headStartEndsAtMs).toBeNull();
    expect(clock.headStartConsumed).toBe(true);
    expect(clock.deadlineMs).toBe(1_000 + LIMIT * 1000);
    expect(clock.paused).toBe(false);
    expect(remainingSiegeMs(clock, 1_000)).toBe(LIMIT * 1000);
  });

  it("consumes Dusk head-start into staggered attack window and extended match deadline", () => {
    const endgame: SiegeEndgameStart = {
      kind: "headStart",
      teamId: "teamB",
      headStartSeconds: DUSK_HEAD_START_SECONDS,
    };
    const clock = createSiegeClocks({ nowMs: 5_000, limitSeconds: LIMIT, endgame });
    expect(clock.headStartConsumed).toBe(true);
    expect(clock.headStartTeamId).toBe("teamB");
    expect(clock.headStartEndsAtMs).toBe(5_000 + DUSK_HEAD_START_SECONDS * 1000);
    expect(clock.roles).toEqual({ teamA: "defend", teamB: "attack" });
    expect(clock.deadlineMs).toBe(5_000 + (DUSK_HEAD_START_SECONDS + LIMIT) * 1000);
    expect(remainingSiegeMs(clock, 5_000)).toBe((DUSK_HEAD_START_SECONDS + LIMIT) * 1000);
  });

  it("starts standard siege with one attacker and dial limit only", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: LIMIT,
      endgame: { kind: "standard", attackingTeam: "teamA" },
    });
    expect(clock.roles).toEqual({ teamA: "attack", teamB: "defend" });
    expect(clock.headStartTeamId).toBeNull();
    expect(clock.headStartEndsAtMs).toBeNull();
    expect(clock.headStartConsumed).toBe(true);
    expect(clock.deadlineMs).toBe(LIMIT * 1000);
  });

  it("safety-stop pause freezes remaining time and resume restores deadline", () => {
    let clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    clock = pauseSiegeClock(clock, 60_000, "safetyStop");
    expect(clock.paused).toBe(true);
    expect(clock.pauseReason).toBe("safetyStop");
    expect(clock.captureBlocked).toBe(true);
    expect(clock.remainingMsWhenPaused).toBe(540_000);
    expect(remainingSiegeMs(clock, 120_000)).toBe(540_000);

    clock = resumeSiegeClock(clock, 200_000);
    expect(clock.paused).toBe(false);
    expect(clock.pauseReason).toBeNull();
    expect(clock.captureBlocked).toBe(false);
    expect(clock.remainingMsWhenPaused).toBeNull();
    expect(clock.deadlineMs).toBe(200_000 + 540_000);
    expect(remainingSiegeMs(clock, 200_000)).toBe(540_000);
  });

  it("idempotent pause while already paused", () => {
    let clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 100,
      endgame: { kind: "dualSiege" },
    });
    clock = pauseSiegeClock(clock, 10_000, "safetyStop");
    const again = pauseSiegeClock(clock, 50_000, "geofence");
    expect(again).toEqual(clock);
  });
});
