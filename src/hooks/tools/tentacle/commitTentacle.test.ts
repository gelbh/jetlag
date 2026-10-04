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
