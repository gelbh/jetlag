import { act, renderHook } from "@testing-library/react";
import type { Feature, Polygon } from "geojson";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as measuringGeometryBudgets from "@/domain/geometry/measuring/measuringGeometryBudgets";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "@/domain/geometry/measuring/measuringGeometryBudgets";
import { useMeasuringCommit } from "./useMeasuringCommit";
import type { MeasuringDraftState } from "./useMeasuringDraftState";
import type { MeasuringPreviews } from "./useMeasuringPreviews";

const buildMeasuringRegions = vi.hoisted(() => vi.fn());

vi.mock("@/domain/geometry/measuring/measuringRegions", () => ({
  buildMeasuringRegions: (...args: unknown[]) => buildMeasuringRegions(...args),
}));

vi.mock("@/services/session/emitSessionActivity", () => ({
  emitQuestionAnsweredActivity: vi.fn(),
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

function draftStub(overrides: Record<string, unknown> = {}): MeasuringDraftState {
  return {
    adminDivisionCounts: null,
    regionPackId: null,
    previewBeforeSend: false,
    measureFromKind: "museum",
    usesAllPlacesInArea: false,
    measuringSeekerPoint: [51.45, -0.15],
    measuringDistanceMeters: 1000,
    measuringSubject: "location",
    measuringLocationCategory: "museum",
    measuringTargetPoint: [51.44, -0.14],
    measuringPlaces: [],
    measuringSeaLevelNearRegion: null,
    measuringAnchorElevationMeters: null,
    measuringTargetPlaceName: "Museum",
    measuringAnswer: "further",
    measuringSeaLevelNote: null,
    measuringLoading: false,
    setMeasuringError: vi.fn(),
    setPreviewOpen: vi.fn(),
    resetDraft: vi.fn(),
    resolvedCoastSegments: [],
    ...overrides,
  } as unknown as MeasuringDraftState;
}

describe("useMeasuringCommit solo persist-or-defer", () => {
  beforeEach(() => {
    buildMeasuringRegions.mockReset();
    buildMeasuringRegions.mockResolvedValue({
      near: samplePolygon(),
      elimination: samplePolygon(),
    });
  });

  it("defers to Point with region JSON when persist-slim fails", async () => {
    const slimSpy = vi
      .spyOn(measuringGeometryBudgets, "persistSlimMeasuringGeometry")
      .mockReturnValue({
        ok: false,
        message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
      });

    const createAnnotation = vi.fn(async (annotation) => ({
      ...annotation,
      id: "ann-1",
      sessionId: "s1",
      status: "active" as const,
    }));
    const setMeasuringError = vi.fn();
    const draft = draftStub({ setMeasuringError });
    const previews = {
      resolvedCoastSegments: [],
      measuringRegionInput: {
        measuringSubject: "location",
        measuringLocationCategory: "museum",
        measuringDistanceMeters: 1000,
        measuringTargetPoint: [51.44, -0.14],
        measuringPlaces: [],
        measuringCoastSegments: [],
        measuringSeaLevelNearRegion: null,
        usesAllPlacesInArea: false,
        measuringAnswer: "further",
        gameArea: {
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
        },
      },
    } as unknown as MeasuringPreviews;

    const { result } = renderHook(() =>
      useMeasuringCommit({
        annotations: [],
        pendingQuestions: [],
        createAnnotation,
        awaitHiderAnswer: false,
        finishPlacement: vi.fn(),
        canSubmitQuestion: true,
        draft,
        previews,
      }),
    );

    await act(async () => {
      await result.current.performCommit();
    });

    expect(setMeasuringError).not.toHaveBeenCalled();
    expect(createAnnotation).toHaveBeenCalledTimes(1);
    const created = createAnnotation.mock.calls[0]![0];
    expect(created.geometry.geometry.type).toBe("Point");
    expect(created.geometry.geometry.coordinates).toEqual([-0.15, 51.45]);
    expect(typeof created.metadata.measuringRegionInputJson).toBe("string");
    expect(created.metadata.measuringAnswer).toBe("further");

    slimSpy.mockRestore();
  });
});

describe("useMeasuringCommit castleSiege oracle", () => {
  const callOracle = vi.fn();
  const onOracleReceipt = vi.fn();
  const submitPendingQuestion = vi.fn();
  const createAnnotation = vi.fn();
  const finishPlacement = vi.fn();

  function measuringPreviews(): MeasuringPreviews {
    return {
      resolvedCoastSegments: [],
      measuringRegionInput: {
        measuringSubject: "location",
        measuringLocationCategory: "museum",
        measuringDistanceMeters: 1000,
        measuringTargetPoint: [51.44, -0.14],
        measuringPlaces: [],
        measuringCoastSegments: [],
        measuringSeaLevelNearRegion: null,
        usesAllPlacesInArea: false,
        measuringAnswer: null,
        gameArea: {
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
        },
      },
    } as unknown as MeasuringPreviews;
  }

  beforeEach(() => {
    callOracle.mockReset();
    onOracleReceipt.mockReset();
    submitPendingQuestion.mockReset();
    createAnnotation.mockReset();
    finishPlacement.mockReset();
    createAnnotation.mockResolvedValue({ id: "ann-1", sessionId: "s1", status: "active" });
    buildMeasuringRegions.mockResolvedValue({
      near: samplePolygon(),
      elimination: samplePolygon(),
    });
  });

  it("classic honor pending path does not call oracle", async () => {
    const draft = draftStub({ measuringAnswer: null });
    const { result } = renderHook(() =>
      useMeasuringCommit({
        annotations: [],
        pendingQuestions: [],
        createAnnotation,
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
        finishPlacement,
        canSubmitQuestion: true,
        draft,
        previews: measuringPreviews(),
        sessionMode: "classic",
        defenderTeamId: "teamB",
        callOracleAsk: callOracle,
        onOracleReceipt,
      }),
    );

    await act(async () => {
      await result.current.performCommit();
    });

    expect(callOracle).not.toHaveBeenCalled();
    expect(onOracleReceipt).not.toHaveBeenCalled();
    expect(submitPendingQuestion).toHaveBeenCalledTimes(1);
    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("castleSiege first pass routes to oracle and stashes receipt", async () => {
    callOracle.mockResolvedValue({ kind: "measuring", answer: "closer" });
    const draft = draftStub({ measuringAnswer: null });
    const { result } = renderHook(() =>
      useMeasuringCommit({
        annotations: [],
        pendingQuestions: [],
        createAnnotation,
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
        finishPlacement,
        canSubmitQuestion: true,
        draft,
        previews: measuringPreviews(),
        sessionMode: "castleSiege",
        defenderTeamId: "teamA",
        callOracleAsk: callOracle,
        onOracleReceipt,
      }),
    );

    await act(async () => {
      await result.current.performCommit();
    });

    expect(callOracle).toHaveBeenCalledWith({
      sessionId: "s1",
      defenderTeamId: "teamA",
      ask: {
        kind: "measuring",
        seekerPoint: { lat: 51.45, lng: -0.15 },
        targetPoint: { lat: 51.44, lng: -0.14 },
      },
    });
    expect(onOracleReceipt).toHaveBeenCalledWith({ kind: "measuring", answer: "closer" });
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("castleSiege confirm-send uses oracle receipt without honor typing", async () => {
    const draft = draftStub({ measuringAnswer: null });
    const { result } = renderHook(() =>
      useMeasuringCommit({
        annotations: [],
        pendingQuestions: [],
        createAnnotation,
        awaitHiderAnswer: true,
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
        finishPlacement,
        canSubmitQuestion: true,
        draft,
        previews: measuringPreviews(),
        sessionMode: "castleSiege",
        defenderTeamId: "teamA",
        callOracleAsk: callOracle,
        oracleReceipt: { kind: "measuring", answer: "further" },
        onOracleReceipt,
      }),
    );

    await act(async () => {
      await result.current.performCommit();
    });

    expect(callOracle).not.toHaveBeenCalled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "measuring",
        metadata: expect.objectContaining({ measuringAnswer: "further" }),
      }),
    );
    expect(finishPlacement).toHaveBeenCalled();
  });
});
