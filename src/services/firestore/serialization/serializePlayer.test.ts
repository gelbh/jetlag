import { describe, expect, it } from "vitest";
import { deserializeGameResultFromFirestore } from "./serializePlayer";

describe("serializePlayer", () => {
  it("deserializes game results from Firestore documents", () => {
    const result = deserializeGameResultFromFirestore("result-1", "session-1", {
      roundNumber: 1,
      gameSize: "large",
      outcome: "found",
      endedAt: "2026-05-14T02:00:00.000Z",
      durationMs: 3_600_000,
      hidingPhaseMs: 600_000,
      seekPhaseMs: 3_000_000,
      seekTimeMs: 2_400_000,
      players: [
        {
          uid: "seeker-1",
          role: "seeker",
          distanceMeters: 1200,
          maxDistanceFromStartMeters: 400,
          questionsAsked: 5,
          won: true,
        },
      ],
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.gameSize).toBe("large");
    expect(result.players).toHaveLength(1);
    expect(result.players[0]?.won).toBe(true);
    expect(result.seekTimeMs).toBe(2_400_000);
  });
});
