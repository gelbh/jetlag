import { describe, expect, it } from "vitest";
import { deserializeSeriesFields, serializeSeriesFields } from "./seriesPersist";
import { awardGameWin, createInitialSeriesState } from "./seriesScore";

describe("seriesPersist", () => {
  it("round-trips initial and progressed state", () => {
    const initial = createInitialSeriesState(3);
    expect(deserializeSeriesFields(serializeSeriesFields(initial))).toEqual({
      gameIndex: 1,
      score: { teamA: 0, teamB: 0 },
      seriesOutcome: null,
    });

    const progressed = awardGameWin(initial, "teamA");
    expect(progressed.kind).toBe("betweenGames");
    const wire = serializeSeriesFields(progressed.state);
    expect(wire).toEqual({
      gameIndex: 2,
      score: { teamA: 1, teamB: 0 },
    });
    expect(deserializeSeriesFields(wire)).toEqual({
      gameIndex: 2,
      score: { teamA: 1, teamB: 0 },
      seriesOutcome: null,
    });
  });

  it("round-trips complete and abandoned outcomes", () => {
    const complete = awardGameWin(createInitialSeriesState(1), "teamB");
    expect(complete.kind).toBe("matchEnd");
    const completeWire = serializeSeriesFields(complete.state);
    expect(completeWire.seriesOutcome).toBe("complete");
    expect(deserializeSeriesFields(completeWire)?.seriesOutcome).toBe("complete");

    const abandoned = {
      ...createInitialSeriesState(3),
      seriesOutcome: "abandoned" as const,
    };
    expect(deserializeSeriesFields(serializeSeriesFields(abandoned))?.seriesOutcome).toBe(
      "abandoned",
    );
  });

  it("rejects malformed maps", () => {
    expect(deserializeSeriesFields(null)).toBeUndefined();
    expect(
      deserializeSeriesFields({ gameIndex: 0, score: { teamA: 0, teamB: 0 } }),
    ).toBeUndefined();
    expect(
      deserializeSeriesFields({ gameIndex: 1, score: { teamA: -1, teamB: 0 } }),
    ).toBeUndefined();
    expect(
      deserializeSeriesFields({
        gameIndex: 1,
        score: { teamA: 0, teamB: 0 },
        seriesOutcome: "nope",
      }),
    ).toBeUndefined();
  });
});
