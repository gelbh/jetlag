import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RadarDistanceOptionKey } from "../../../domain/questions";
import { commitRadar } from "./commitRadar";

const createAnnotation = vi.fn();
const submitPendingQuestion = vi.fn();
const setMapError = vi.fn();
const onSuccess = vi.fn();
const callOracle = vi.fn();
const onOracleReceipt = vi.fn();

vi.mock("@/services/session/emitSessionActivity", () => ({
  emitQuestionAnsweredActivity: vi.fn(),
}));

function baseInput(overrides: Partial<Parameters<typeof commitRadar>[0]> = {}) {
  return {
    canSubmitQuestion: true,
    radarCenter: [53.35, -6.26] as [number, number],
    radarRadius: 500,
    radarChooseCustom: false,
    resolvedRadarRadius: 500,
    radarAnswer: "yes" as const,
    gameSize: "medium" as const,
    distanceUnit: "metric" as const,
    usedRadarOptions: new Set<RadarDistanceOptionKey>(),
    awaitHiderAnswer: true,
    submitPendingQuestion,
    sessionId: "s1",
    senderUid: "u1",
    cardDraw: 1,
    cardKeep: 1,
    createAnnotation,
    setMapError,
    onSuccess,
    ...overrides,
  };
}

describe("commitRadar castleSiege oracle", () => {
  beforeEach(() => {
    createAnnotation.mockReset();
    submitPendingQuestion.mockReset();
    setMapError.mockReset();
    onSuccess.mockReset();
    callOracle.mockReset();
    onOracleReceipt.mockReset();
    createAnnotation.mockResolvedValue({ id: "ann-1" });
    submitPendingQuestion.mockResolvedValue(undefined);
  });

  it("classic honor pending path does not call oracle", async () => {
    await commitRadar(
      baseInput({
        sessionMode: "classic",
        callOracleAsk: callOracle,
        defenderTeamId: "teamB",
        onOracleReceipt,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(onOracleReceipt).not.toHaveBeenCalled();
    expect(submitPendingQuestion).toHaveBeenCalledTimes(1);
    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("castleSiege first pass routes to oracle and stashes receipt", async () => {
    callOracle.mockResolvedValue({ kind: "radar", answer: "no" });

    await commitRadar(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: true,
        radarAnswer: null,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        onOracleReceipt,
      }),
    );

    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: {
        kind: "radar",
        point: { lat: 53.35, lng: -6.26 },
        radiusMeters: 500,
      },
    });
    expect(onOracleReceipt).toHaveBeenCalledWith({ kind: "radar", answer: "no" });
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("castleSiege confirm-send uses oracle receipt without honor typing", async () => {
    await commitRadar(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: true,
        radarAnswer: null,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        oracleReceipt: { kind: "radar", answer: "yes" },
        onOracleReceipt,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "radar",
        metadata: expect.objectContaining({ inside: true }),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});
