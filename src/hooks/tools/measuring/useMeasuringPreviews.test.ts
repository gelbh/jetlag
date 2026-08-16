import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Feature, Polygon } from "geojson";
import {
  MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE,
  MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
} from "@/domain/geometry/measuring/measuringGeometryBudgets";
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

describe("useMeasuringPreviews budget gate", () => {
  it("skips near/elim builds when multi-place count is over budget", () => {
    const setMeasuringError = vi.fn();
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

    const { result } = renderHook(() => useMeasuringPreviews(gameArea, draft));

    expect(buildMeasuringBoundaryPreview).not.toHaveBeenCalled();
    expect(buildMeasuringEliminationPreview).not.toHaveBeenCalled();
    expect(setMeasuringError).toHaveBeenCalledWith(
      MEASURING_MULTI_PLACE_OVER_BUDGET_MESSAGE,
    );
    expect(result.current.measuringNearRegion).toBeNull();
    expect(result.current.measuringEliminationPreview).toBeNull();
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
