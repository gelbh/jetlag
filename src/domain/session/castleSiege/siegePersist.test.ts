import { describe, expect, it } from "vitest";
import { DUSK_HEAD_START_SECONDS } from "./siegeClocks";
import {
  buildStartSiegePublicPatch,
  deserializeSiegeClock,
  serializeSiegeClock,
} from "./siegePersist";

describe("siegePersist", () => {
  it("buildStartSiegePublicPatch sets phase siege and serializes clocks", () => {
    const patch = buildStartSiegePublicPatch({
      nowMs: 10_000,
      limitSeconds: 1800,
      endgame: {
        kind: "headStart",
        teamId: "teamA",
        headStartSeconds: DUSK_HEAD_START_SECONDS,
      },
    });
    expect(patch.phase).toBe("siege");
    const clock = deserializeSiegeClock(patch.siegeClock);
    expect(clock?.headStartConsumed).toBe(true);
    expect(clock?.headStartTeamId).toBe("teamA");
    expect(clock?.headStartEndsAtMs).toBe(10_000 + DUSK_HEAD_START_SECONDS * 1000);
  });

  it("round-trips serialize/deserialize", () => {
    const patch = buildStartSiegePublicPatch({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    const clock = deserializeSiegeClock(patch.siegeClock);
    expect(clock).toBeDefined();
    expect(deserializeSiegeClock(serializeSiegeClock(clock!))).toEqual(clock);
  });

  it("rejects malformed siegeClock maps", () => {
    expect(deserializeSiegeClock(null)).toBeUndefined();
    expect(deserializeSiegeClock({ limitSeconds: 1 })).toBeUndefined();
    expect(
      deserializeSiegeClock({
        limitSeconds: 1,
        deadlineMs: 2,
        paused: false,
        headStartConsumed: false,
        roles: { teamA: "attack", teamB: "defend" },
      }),
    ).toBeUndefined();
  });
});
