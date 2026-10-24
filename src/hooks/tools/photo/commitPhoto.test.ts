import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitPhoto } from "./commitPhoto";

const emitPhotoAnsweredActivity = vi.hoisted(() => vi.fn());

vi.mock("@/services/session/emitSessionActivity", () => ({
  emitPhotoAnsweredActivity: (...args: unknown[]) => emitPhotoAnsweredActivity(...args),
}));

const callOracle = vi.fn();
const onOracleReceipt = vi.fn();
const submitPendingQuestion = vi.fn();
const setMapError = vi.fn();
const onSuccess = vi.fn();

function baseInput(overrides: Partial<Parameters<typeof commitPhoto>[0]> = {}) {
  return {
    canSubmitQuestion: true,
    hasOpenQuestion: false,
    categoryId: "tree" as const,
    usedCategories: new Set<"tree">(),
    awaitHiderAnswer: true,
    submitPendingQuestion,
    sessionId: "s1",
    senderUid: "u1",
    distanceUnit: "imperial" as const,
    cardDraw: 1,
    cardKeep: 1,
    setMapError,
    onSuccess,
    ...overrides,
  };
}

describe("commitPhoto castleSiege oracle", () => {
  beforeEach(() => {
    callOracle.mockReset();
    onOracleReceipt.mockReset();
    submitPendingQuestion.mockReset();
    setMapError.mockReset();
    onSuccess.mockReset();
    emitPhotoAnsweredActivity.mockReset();
    submitPendingQuestion.mockResolvedValue(undefined);
  });

  it("classic honor pending path does not call oracle", async () => {
    await commitPhoto(
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
    expect(onSuccess).toHaveBeenCalled();
  });

  it("castleSiege first pass routes to oracle and stashes receipt", async () => {
    callOracle.mockResolvedValue({
      kind: "photo",
      answer: "mirror",
      mirror: { required: true, categoryId: "tree" },
    });

    await commitPhoto(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: false,
        submitPendingQuestion: undefined,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        onOracleReceipt,
      }),
    );

    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: { kind: "photo", categoryId: "tree" },
    });
    expect(onOracleReceipt).toHaveBeenCalledWith({
      kind: "photo",
      answer: "mirror",
      mirror: { required: true, categoryId: "tree" },
    });
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("castleSiege confirm-send uses oracle receipt without coords", async () => {
    await commitPhoto(
      baseInput({
        sessionMode: "castleSiege",
        awaitHiderAnswer: false,
        submitPendingQuestion: undefined,
        callOracleAsk: callOracle,
        defenderTeamId: "teamA",
        oracleReceipt: {
          kind: "photo",
          answer: "mirror",
          mirror: { required: true, categoryId: "tree" },
        },
        onOracleReceipt,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(emitPhotoAnsweredActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        answerSummary: "Mirror · tree",
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});
