import { describe, expect, it } from "vitest";
import { createIdleSiegeCapture, submitSiegeCapture } from "./siegeCapture";
import { deserializeSiegeCapture, serializeSiegeCapture } from "./siegeCapturePersist";
import { createSiegeClocks } from "./siegeClocks";
import { createInitialSiegeGuards } from "./siegeGuards";

describe("siegeCapturePersist", () => {
  it("round-trips idle and pending captures", () => {
    const idle = createIdleSiegeCapture();
    expect(deserializeSiegeCapture(serializeSiegeCapture(idle))).toEqual(idle);

    const submitted = submitSiegeCapture({
      capture: idle,
      clock: createSiegeClocks({
        nowMs: 0,
        limitSeconds: 600,
        endgame: { kind: "standard", attackingTeam: "teamA" },
      }),
      guards: createInitialSiegeGuards(),
      nowMs: 100,
      attackingTeamId: "teamA",
      submittedByUid: "uid-a",
      photoStoragePath: "sessions/s1/siegeCaptures/a.jpg",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }
    expect(deserializeSiegeCapture(serializeSiegeCapture(submitted.capture))).toEqual(
      submitted.capture,
    );
  });

  it("rejects malformed maps", () => {
    expect(deserializeSiegeCapture(null)).toBeUndefined();
    expect(deserializeSiegeCapture({ status: "nope" })).toBeUndefined();
  });
});
