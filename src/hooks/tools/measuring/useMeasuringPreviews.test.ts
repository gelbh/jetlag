import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Feature, Polygon } from "geojson";
import {
  MEASURING_LINEAR_MAX_VERTICES,
  MEASURING_LINEAR_OVER_BUDGET_MESSAGE,
  MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE,
  MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
} from "@/domain/geometry/measuring/measuringGeometryBudgets";
import * as measuringGeometryBudgets from "@/domain/geometry/measuring/measuringGeometryBudgets";
import { previewGeometryFingerprint } from "@/domain/geometry/measuring/previewGeometryFingerprint";
import {
  useMeasuringPreviews,
  useMeasuringPublishSignature,
  type MeasuringPreviews,
} from "./useMeasuringPreviews";
import type { MeasuringDraftState } from "./useMeasuringDraftState";
import type { GameArea } from "@/domain/map/annotations";

const buildMeasuringBoundaryPreview = vi.hoisted(() => vi.fn());
const buildMeasuringEliminationPreview = vi.hoisted(() => vi.fn());
const buildMeasuringCoarseFeature = vi.hoisted(() => vi.fn());
const refineMeasuringFeatureStep = vi.hoisted(() => vi.fn());

vi.mock("@/domain/geometry/measuring/measuringRegions", () => ({
  buildMeasuringBoundaryPreview: (...args: unknown[]) =>
    buildMeasuringBoundaryPreview(...args),
  buildMeasuringEliminationPreview: (...args: unknown[]) =>
    buildMeasuringEliminationPreview(...args),
}));

vi.mock("@/domain/geometry/measuring/measuringLod", async () => {
  const actual = await vi.importActual<
    typeof import("@/domain/geometry/measuring/measuringLod")
  >("@/domain/geometry/measuring/measuringLod");
  return {
    ...actual,
    buildMeasuringCoarseFeature: (...args: unknown[]) =>
      buildMeasuringCoarseFeature(...args),
    refineMeasuringFeatureStep: (...args: unknown[]) =>
      refineMeasuringFeatureStep(...args),
  };
});

function samplePreview(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-0.2, 51.4],
          [-0.1, 51.4],
          [-0.1, 51.5],
          [-0.2, 51.5],
          [-0.2, 51.4],
        ],
      ],
    },
  };
}

function coarsePreview(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: { lod: "coarse" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-0.2, 51.4],
          [-0.05, 51.4],
          [-0.05, 51.55],
          [-0.2, 51.55],
          [-0.2, 51.4],
        ],
      ],
    },
  };
}

const baseDraft = {
  coastlineContextVersion: 0,
  measuringAnchorElevationMeters: null,
  measuringAnswer: null,
  measuringCoastSegments: [],
  measuringDistanceMeters: 1_000,
  measuringError: null,
  measuringLoading: false,
  measuringLocationCategory: null,
  measuringPlaces: [],
  measuringSearchLoading: false,
  measuringSearchQuery: "",
  measuringSearchResults: [],
  measuringSeaLevelEdgeCase: null,
  measuringSeaLevelNote: null,
  measuringSeekerPlaceName: null,
  measuringSeekerPoint: null,
  measuringSubject: "location",
  measuringTargetMode: "map",
  measuringTargetPlaceName: null,
  measuringTargetPoint: null,
} as unknown as MeasuringDraftState;

describe("useMeasuringPublishSignature", () => {
  it("uses previewGeometryFingerprint instead of JSON.stringify", () => {
    const boundaryPreview = samplePreview();
    const previews = {
      measuringBoundaryPreview: boundaryPreview,
      measuringEliminationPreview: null,
    } as MeasuringPreviews;

    const { result } = renderHook(() =>
      useMeasuringPublishSignature(baseDraft, previews, false),
    );

    const expected = previewGeometryFingerprint(boundaryPreview);
    expect(result.current).toContain(`|${expected}|`);
    expect(result.current).not.toContain(JSON.stringify(boundaryPreview.geometry));
  });
});

const sampleGameArea: GameArea = {
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
};

describe("useMeasuringPreviews budget gate", () => {
  beforeEach(() => {
    buildMeasuringBoundaryPreview.mockReset();
    buildMeasuringEliminationPreview.mockReset();
    buildMeasuringCoarseFeature.mockReset();
    refineMeasuringFeatureStep.mockReset();
  });

  it("paints coarse LOD when all-places count exceeds the former 128 cap", async () => {
    const setMeasuringError = vi.fn();
    const near = samplePreview();
    const elim = samplePreview();
    const coarse = coarsePreview();
    buildMeasuringBoundaryPreview.mockResolvedValue(near);
    buildMeasuringEliminationPreview.mockResolvedValue(elim);
    buildMeasuringCoarseFeature.mockReturnValue(coarse);
    refineMeasuringFeatureStep.mockReturnValue({ feature: near, done: true });

    const draft = {
      ...baseDraft,
      usesAllPlacesInArea: true,
      measuringPlaces: Array.from({ length: 129 }, (_, i) => ({
        id: `p-${i}`,
        name: `P${i}`,
        point: [51.45, -0.15] as [number, number],
      })),
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      setMeasuringError,
    } as unknown as MeasuringDraftState;

    const { result } = renderHook(() =>
      useMeasuringPreviews(sampleGameArea, draft),
    );

    await waitFor(() => {
      expect(buildMeasuringBoundaryPreview).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.measuringNearRegion).not.toBeNull();
    });

    expect(setMeasuringError).not.toHaveBeenCalledWith(
      MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE,
    );
  });

  it("completed preview uses full geometry, not persist-slim", async () => {
    const persistSlim = vi.spyOn(
      measuringGeometryBudgets,
      "persistSlimMeasuringGeometry",
    );
    const setMeasuringError = vi.fn();
    const near = samplePreview();
    buildMeasuringBoundaryPreview.mockResolvedValue(near);
    buildMeasuringEliminationPreview.mockResolvedValue(null);
    buildMeasuringCoarseFeature.mockReturnValue(near);
    refineMeasuringFeatureStep.mockReturnValue({ feature: near, done: true });

    const draft = {
      ...baseDraft,
      usesAllPlacesInArea: false,
      measuringAnswer: "further",
      measuringTargetPoint: [51.45, -0.15] as [number, number],
      measuringPlaces: [],
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      setMeasuringError,
    } as unknown as MeasuringDraftState;

    const { result } = renderHook(() =>
      useMeasuringPreviews(sampleGameArea, draft),
    );

    await waitFor(() => {
      expect(result.current.measuringLodPhase).toBe("complete");
    });

    expect(persistSlim).not.toHaveBeenCalled();
    persistSlim.mockRestore();
  });

  it("paints linear measures above the former vertex cap", async () => {
    const setMeasuringError = vi.fn();
    const near = samplePreview();
    const coarse = coarsePreview();
    buildMeasuringBoundaryPreview.mockResolvedValue(near);
    buildMeasuringEliminationPreview.mockResolvedValue(null);
    buildMeasuringCoarseFeature.mockReturnValue(coarse);
    refineMeasuringFeatureStep.mockReturnValue({ feature: near, done: true });

    const draft = {
      ...baseDraft,
      measuringSubject: "location",
      measuringLocationCategory: "high_speed_rail_line",
      usesAllPlacesInArea: false,
      measuringPlaces: [],
      measuringCoastSegments: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: Array.from(
              { length: MEASURING_LINEAR_MAX_VERTICES + 1 },
              (_, i) => [i * 0.0001, 0] as [number, number],
            ),
          },
        },
      ],
      measuringSeaLevelNearRegion: null,
      setMeasuringError,
    } as unknown as MeasuringDraftState;

    const { result } = renderHook(() =>
      useMeasuringPreviews(sampleGameArea, draft),
    );

    await waitFor(() => {
      expect(buildMeasuringBoundaryPreview).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.measuringNearRegion).not.toBeNull();
    });

    expect(setMeasuringError).not.toHaveBeenCalledWith(
      MEASURING_LINEAR_OVER_BUDGET_MESSAGE,
    );
  });

  it("paints coarse LOD instead of refusing oversized geometry on preview", async () => {
    const setMeasuringError = vi.fn();
    const near = samplePreview();
    const elim = samplePreview();
    const coarse = coarsePreview();
    buildMeasuringBoundaryPreview.mockResolvedValue(near);
    buildMeasuringEliminationPreview.mockResolvedValue(elim);
    buildMeasuringCoarseFeature.mockReturnValue(coarse);
    refineMeasuringFeatureStep.mockReturnValue({ feature: near, done: true });

    const gameArea: GameArea = {
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
    };
    const draft = {
      ...baseDraft,
      usesAllPlacesInArea: false,
      measuringAnswer: "further",
      measuringTargetPoint: [51.45, -0.15] as [number, number],
      measuringPlaces: [],
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      setMeasuringError,
    } as unknown as MeasuringDraftState;

    const { result } = renderHook(() => useMeasuringPreviews(gameArea, draft));

    await waitFor(() => {
      expect(result.current.measuringNearRegion).not.toBeNull();
    });

    expect(setMeasuringError).not.toHaveBeenCalledWith(
      MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
    );
    expect(
      setMeasuringError.mock.calls.every(
        (call) => call[0] !== MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
      ),
    ).toBe(true);
    expect(buildMeasuringCoarseFeature).toHaveBeenCalledWith(near);
    expect(result.current.measuringNearRegion).toBeTruthy();
  });
});
