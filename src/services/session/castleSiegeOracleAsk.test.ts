import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AnswerCastleSiegeOracleAskFn,
  answerCastleSiegeOracleAsk,
  resolveAskAnswer,
} from "./castleSiegeOracleAsk";

const callWithResilience = vi.hoisted(() => vi.fn());
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/services/core/firebase/callWithResilience", () => ({
  callWithResilience,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured,
}));

describe("resolveAskAnswer", () => {
  const callOracle = vi.fn<AnswerCastleSiegeOracleAskFn>();

  beforeEach(() => {
    callOracle.mockReset();
    callWithResilience.mockReset();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("classic honor path never calls the oracle callable", async () => {
    const honor = vi.fn(async () => "typed-yes");
    const result = await resolveAskAnswer({
      mode: "classic",
      honor,
      oracle: {
        sessionId: "s1",
        defenderTeamId: "teamB",
        ask: { kind: "radar", point: { lat: 1, lng: 2 }, radiusMeters: 500 },
        callOracle,
      },
    });

    expect(result).toEqual({ path: "honor", value: "typed-yes" });
    expect(honor).toHaveBeenCalledTimes(1);
    expect(callOracle).not.toHaveBeenCalled();
    expect(callWithResilience).not.toHaveBeenCalled();
  });

  it("absent mode keeps honor path", async () => {
    const result = await resolveAskAnswer({
      mode: undefined,
      honor: () => "self-recorded",
      oracle: {
        sessionId: "s1",
        defenderTeamId: "teamA",
        ask: { kind: "compass", point: { lat: 0, lng: 0 } },
        callOracle,
      },
    });
    expect(result.path).toBe("honor");
    expect(callOracle).not.toHaveBeenCalled();
  });

  it("castleSiege routes through answerCastleSiegeOracleAsk", async () => {
    callOracle.mockResolvedValue({ kind: "radar", answer: "no" });

    const honor = vi.fn(async () => "should-not-run");
    const result = await resolveAskAnswer({
      mode: "castleSiege",
      honor,
      oracle: {
        sessionId: "siege-1",
        defenderTeamId: "teamA",
        ask: {
          kind: "radar",
          point: { lat: 53.35, lng: -6.26 },
          radiusMeters: 1000,
        },
        callOracle,
      },
    });

    expect(honor).not.toHaveBeenCalled();
    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "siege-1",
      defenderTeamId: "teamA",
      ask: {
        kind: "radar",
        point: { lat: 53.35, lng: -6.26 },
        radiusMeters: 1000,
      },
    });
    expect(result).toEqual({
      path: "oracle",
      receipt: { kind: "radar", answer: "no" },
    });
  });
});

describe("answerCastleSiegeOracleAsk", () => {
  beforeEach(() => {
    callWithResilience.mockReset();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("calls the Functions callable name answerCastleSiegeOracleAsk", async () => {
    callWithResilience.mockResolvedValue({
      ok: true,
      receipt: { kind: "radar", answer: "yes" },
    });

    const receipt = await answerCastleSiegeOracleAsk({
      sessionId: "s1",
      defenderTeamId: "teamB",
      ask: { kind: "radar", point: { lat: 1, lng: 2 }, radiusMeters: 100 },
    });

    expect(callWithResilience).toHaveBeenCalledWith(
      "answerCastleSiegeOracleAsk",
      {
        sessionId: "s1",
        defenderTeamId: "teamB",
        ask: { kind: "radar", point: { lat: 1, lng: 2 }, radiusMeters: 100 },
      },
      { idempotent: true },
    );
    expect(receipt).toEqual({ kind: "radar", answer: "yes" });
  });
});
