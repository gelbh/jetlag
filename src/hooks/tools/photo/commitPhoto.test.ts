import { beforeEach, expect, vi } from "vitest";
import { describeCastleSiegeOracleCommit } from "../castleSiegeOracleCommit.testHarness";
import { commitPhoto } from "./commitPhoto";

const emitPhotoAnsweredActivity = vi.hoisted(() => vi.fn());

vi.mock("@/services/session/emitSessionActivity", () => ({
  emitPhotoAnsweredActivity: (...args: unknown[]) => emitPhotoAnsweredActivity(...args),
}));

const setMapError = vi.fn();
const onSuccess = vi.fn();

beforeEach(() => {
  emitPhotoAnsweredActivity.mockReset();
});

function baseInput(overrides: Partial<Parameters<typeof commitPhoto>[0]> = {}) {
  return {
    canSubmitQuestion: true,
    hasOpenQuestion: false,
    categoryId: "tree" as const,
    usedCategories: new Set<"tree">(),
    awaitHiderAnswer: true,
    submitPendingQuestion: undefined,
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

describeCastleSiegeOracleCommit({
  name: "commitPhoto",
  oracleKind: "photo",
  run: (input) => commitPhoto(input as Parameters<typeof commitPhoto>[0]),
  baseInput: (overrides) => {
    const { sessionMode, submitPendingQuestion, ...rest } = overrides;
    return baseInput({
      awaitHiderAnswer: sessionMode === "classic",
      sessionMode,
      submitPendingQuestion:
        sessionMode === "classic"
          ? (submitPendingQuestion as Parameters<typeof commitPhoto>[0]["submitPendingQuestion"])
          : undefined,
      defenderTeamId: "teamA",
      sessionId: "s1",
      senderUid: "u1",
      ...rest,
    });
  },
  expectFirstPassAsk: (callOracle) => {
    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: { kind: "photo", categoryId: "tree" },
    });
  },
  expectConfirmAnnotation: () => {
    expect(emitPhotoAnsweredActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        answerSummary: "Mirror · tree",
      }),
    );
  },
  expectConfirmSuccess: (onSuccess) => {
    expect(onSuccess).toHaveBeenCalled();
  },
});
