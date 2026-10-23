import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "@/domain/geometry/measuring/measuringGeometryBudgets";
import type { GameArea } from "@/domain/map/annotations";
import { type CommitTentacleInput, commitTentacle } from "./commitTentacle";

const tentacleEliminationJsonForAnswer = vi.hoisted(() => vi.fn());

vi.mock("@/domain/geometry/tentacle/tentacleGeometry", () => ({
  tentacleEliminationJsonForAnswer: (...args: unknown[]) =>
    tentacleEliminationJsonForAnswer(...args),
}));

vi.mock("@/services/session/emitSessionActivity", () => ({
  emitQuestionAnsweredActivity: vi.fn(),
}));

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-1, 50],
      [1, 50],
      [1, 52],
      [-1, 52],
      [-1, 50],
    ],
  ],
};

function baseInput(overrides: Partial<CommitTentacleInput> = {}): CommitTentacleInput {
  return {
    canSubmitQuestion: true,
    tentacleCategoryChosen: true,
    tentacleCategoryId: "museum",
    tentacleCenter: [51.45, -0.15],
    tentaclePois: [
      {
        id: "poi-1",
        name: "West Museum",
        lat: 51.46,
        lng: -0.15,
        category: "museum",
      },
    ],
    tentacleOutOfReach: false,
    selectedPoiId: "poi-1",
    searchRadiusMeters: 1000,
    sessionRules: { gameSize: "medium" },
    gameArea,
    awaitHiderAnswer: false,
    distanceUnit: "imperial",
    cardDraw: 1,
    cardKeep: 1,
    createAnnotation: vi.fn(async (annotation) => ({
      ...annotation,
      id: "ann-1",
      sessionId: "s1",
      status: "active",
    })),
    setMapError: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
}

describe("commitTentacle elim-JSON soft-fail", () => {
  beforeEach(() => {
    tentacleEliminationJsonForAnswer.mockReset();
  });

  it("still creates Point annotation when elim JSON throws", async () => {
    tentacleEliminationJsonForAnswer.mockRejectedValue(
      new Error(MEASURING_PERSIST_OVER_BUDGET_MESSAGE),
    );
    const createAnnotation = vi.fn(async (annotation) => ({
      ...annotation,
      id: "ann-1",
      sessionId: "s1",
      status: "active" as const,
    }));
    const setMapError = vi.fn();
    const onSuccess = vi.fn();

    await commitTentacle(baseInput({ createAnnotation, setMapError, onSuccess }));

    expect(setMapError).not.toHaveBeenCalled();
    expect(createAnnotation).toHaveBeenCalledTimes(1);
    const created = createAnnotation.mock.calls[0]![0];
    expect(created.geometry.geometry.type).toBe("Point");
    expect(created.metadata.tentacleEliminationJson).toBeUndefined();
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("commitTentacle castleSiege oracle", () => {
  const callOracle = vi.fn();
  const onOracleReceipt = vi.fn();
  const submitPendingQuestion = vi.fn();
  const createAnnotation = vi.fn();
  const onSuccess = vi.fn();
  const setMapError = vi.fn();

  beforeEach(() => {
    tentacleEliminationJsonForAnswer.mockReset();
    tentacleEliminationJsonForAnswer.mockResolvedValue(undefined);
    callOracle.mockReset();
    onOracleReceipt.mockReset();
    submitPendingQuestion.mockReset();
    createAnnotation.mockReset();
    onSuccess.mockReset();
    setMapError.mockReset();
    createAnnotation.mockResolvedValue({ id: "ann-1", sessionId: "s1", status: "active" });
  });

  it("classic honor pending path does not call oracle", async () => {
    await commitTentacle(
      baseInput({
        sessionMode: "classic",
        awaitHiderAnswer: true,
        selectedPoiId: null,
        tentacleOutOfReach: false,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
        callOracleAsk: callOracle,
        defenderTeamId: "teamB",
        onOracleReceipt,
        createAnnotation,
        onSuccess,
        setMapError,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(onOracleReceipt).not.toHaveBeenCalled();
    expect(submitPendingQuestion).toHaveBeenCalledTimes(1);
    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("castleSiege first pass routes to oracle and stashes receipt", async () => {
    callOracle.mockResolvedValue({ kind: "tentacle", answer: "poi-1" });

    await commitTentacle(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: true,
        selectedPoiId: null,
        tentacleOutOfReach: false,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        onOracleReceipt,
        sessionId: "s1",
        senderUid: "u1",
        submitPendingQuestion,
        createAnnotation,
        onSuccess,
        setMapError,
      }),
    );

    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: {
        kind: "tentacle",
        center: { lat: 51.45, lng: -0.15 },
        radiusMeters: 1000,
        pois: [{ id: "poi-1", lat: 51.46, lng: -0.15 }],
      },
    });
    expect(onOracleReceipt).toHaveBeenCalledWith({ kind: "tentacle", answer: "poi-1" });
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("castleSiege confirm-send uses oracle receipt without honor typing", async () => {
    await commitTentacle(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: true,
        selectedPoiId: null,
        tentacleOutOfReach: false,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        oracleReceipt: { kind: "tentacle", answer: "poi-1" },
        onOracleReceipt,
        sessionId: "s1",
        senderUid: "u1",
        submitPendingQuestion,
        createAnnotation,
        onSuccess,
        setMapError,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tentacle",
        metadata: expect.objectContaining({
          highlightedPoiId: "poi-1",
          tentacleOutOfReach: false,
        }),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});
