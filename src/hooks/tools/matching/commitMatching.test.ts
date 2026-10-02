import type { Feature, Polygon } from "geojson";
import { describe, expect, it, vi } from "vitest";
import type { MatchingFeature } from "@/domain/geo/types";
import * as persistSlim from "@/domain/geometry/progressive/persistSlim";
import { POLYGON_PERSIST_OVER_BUDGET_MESSAGE } from "@/domain/geometry/progressive/persistSlim";
import type { GameArea } from "@/domain/map/annotations";
import { type CommitMatchingInput, commitMatching, performMatchingCommit } from "./commitMatching";

const buildMatchingEliminationRegion = vi.hoisted(() => vi.fn());
const buildSameNearestRegion = vi.hoisted(() => vi.fn());

vi.mock("@/domain/geometry/measuring/matchingGeometry", () => ({
  buildMatchingEliminationRegion: (...args: unknown[]) => buildMatchingEliminationRegion(...args),
  buildSameNearestRegion: (...args: unknown[]) => buildSameNearestRegion(...args),
}));

function samplePolygon(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  };
}

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

const feature: MatchingFeature = {
  id: "f-0",
  name: "Airport",
  point: [51.45, -0.15],
};

function baseInput(overrides: Partial<CommitMatchingInput> = {}): CommitMatchingInput {
  return {
    canSubmitQuestion: true,
    matchingSeekerPoint: [51.45, -0.15],
    matchingCategoryId: "commercial_airport",
    matchingNullAnswer: false,
    matchingNearestFeatureId: "f-0",
    matchingNearestFeatureName: "Airport",
    matchingNearestFeaturePoint: [51.47, -0.15],
    matchingDistanceMeters: 1000,
    matchingFeatureCount: 1,
    matchingFeatures: [feature],
    matchingAnswer: "yes",
    matchingTransitMetroId: null,
    previewBeforeSend: false,
    customCategories: [],
    gameArea,
    awaitHiderAnswer: false,
    cardDraw: 3,
    cardKeep: 1,
    createAnnotation: vi.fn(async (annotation) => ({
      ...annotation,
      id: "ann-1",
      sessionId: "s1",
      status: "active",
    })),
    setMatchingError: vi.fn(),
    setPreviewOpen: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
}

describe("commitMatching empty play-area guard", () => {
  it("refuses empty-catalog null-match commit", async () => {
    const submitPendingQuestion = vi.fn();
    const result = await commitMatching(
      baseInput({
        matchingNullAnswer: true,
        matchingNearestFeatureId: null,
        matchingNearestFeatureName: null,
        matchingFeatureCount: 0,
        matchingFeatures: [],
        matchingAnswer: null,
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
      }),
    );
    expect(result).toBe("noop");
    expect(submitPendingQuestion).not.toHaveBeenCalled();
  });
});

describe("performMatchingCommit empty play-area guard", () => {
  it("refuses empty-catalog null-match when called directly", async () => {
    const submitPendingQuestion = vi.fn();
    const createAnnotation = vi.fn();

    await performMatchingCommit(
      baseInput({
        matchingNullAnswer: true,
        matchingNearestFeatureId: null,
        matchingNearestFeatureName: null,
        matchingFeatureCount: 0,
        matchingFeatures: [],
        matchingAnswer: null,
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
        createAnnotation,
      }),
    );

    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
  });
});

describe("performMatchingCommit persist-slim", () => {
  it("persist-slims elim geometry before createAnnotation", async () => {
    const elim = samplePolygon();
    buildSameNearestRegion.mockResolvedValue(samplePolygon());
    buildMatchingEliminationRegion.mockResolvedValue(elim);
    const slimSpy = vi.spyOn(persistSlim, "persistSlimPolygonFeature");
    const createAnnotation = vi.fn(async (annotation) => ({
      ...annotation,
      id: "ann-1",
      sessionId: "s1",
      status: "active" as const,
    }));

    await performMatchingCommit(baseInput({ createAnnotation }));

    expect(slimSpy).toHaveBeenCalledTimes(2);
    expect(createAnnotation).toHaveBeenCalled();
    slimSpy.mockRestore();
  });

  it("sets a storage error and skips create when persist-slim fails", async () => {
    buildSameNearestRegion.mockResolvedValue(samplePolygon());
    buildMatchingEliminationRegion.mockResolvedValue(samplePolygon());
    const slimSpy = vi.spyOn(persistSlim, "persistSlimPolygonFeature").mockReturnValue({
      ok: false,
      message: POLYGON_PERSIST_OVER_BUDGET_MESSAGE,
    });
    const createAnnotation = vi.fn();
    const setMatchingError = vi.fn();

    await performMatchingCommit(baseInput({ createAnnotation, setMatchingError }));

    expect(setMatchingError).toHaveBeenCalledWith(POLYGON_PERSIST_OVER_BUDGET_MESSAGE);
    expect(createAnnotation).not.toHaveBeenCalled();
    slimSpy.mockRestore();
  });
});
