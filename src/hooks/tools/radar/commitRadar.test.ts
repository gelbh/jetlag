import { expect, vi } from "vitest";
import type { RadarDistanceOptionKey } from "../../../domain/questions";
import { describeCastleSiegeOracleCommit } from "../castleSiegeOracleCommit.testHarness";
import { commitRadar } from "./commitRadar";

const createAnnotation = vi.fn();
const submitPendingQuestion = vi.fn();
const setMapError = vi.fn();
const onSuccess = vi.fn();

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

describeCastleSiegeOracleCommit({
  name: "commitRadar",
  oracleKind: "radar",
  run: (input) => commitRadar(input as Parameters<typeof commitRadar>[0]),
  baseInput: (overrides) =>
    baseInput({
      awaitHiderAnswer: true,
      radarAnswer: null,
      defenderTeamId: "teamA",
      sessionId: "s1",
      senderUid: "u1",
      ...overrides,
    }),
  expectFirstPassAsk: (callOracle) => {
    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: {
        kind: "radar",
        point: { lat: 53.35, lng: -6.26 },
        radiusMeters: 500,
      },
    });
  },
  expectConfirmAnnotation: (createAnnotation) => {
    expect(createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "radar",
        metadata: expect.objectContaining({ inside: true }),
      }),
    );
  },
  expectConfirmSuccess: (onSuccess) => {
    expect(onSuccess).toHaveBeenCalled();
  },
});
