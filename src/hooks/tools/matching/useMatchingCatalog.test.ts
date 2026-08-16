import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Feature, Polygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import type { MatchingFeature } from "@/domain/geo/types";
import { useMatchingCatalog } from "./useMatchingCatalog";

const buildMatchingEliminationRegion = vi.hoisted(() => vi.fn());
const buildSameNearestRegion = vi.hoisted(() => vi.fn());
const buildCoarsePolygonFeature = vi.hoisted(() => vi.fn());
const refinePolygonFeatureStep = vi.hoisted(() => vi.fn());

vi.mock("@/domain/geometry/measuring/matchingGeometry", () => ({
  buildMatchingEliminationRegion: (...args: unknown[]) =>
    buildMatchingEliminationRegion(...args),
  buildSameNearestRegion: (...args: unknown[]) =>
    buildSameNearestRegion(...args),
}));

vi.mock("@/domain/geometry/progressive/polygonLod", async () => {
  const actual = await vi.importActual<
    typeof import("@/domain/geometry/progressive/polygonLod")
  >("@/domain/geometry/progressive/polygonLod");
  return {
    ...actual,
    buildCoarsePolygonFeature: (...args: unknown[]) =>
      buildCoarsePolygonFeature(...args),
    refinePolygonFeatureStep: (...args: unknown[]) =>
      refinePolygonFeatureStep(...args),
  };
});

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

function featureWithArea(index: number, size: number): MatchingFeature {
  return {
    id: `f-${index}`,
    name: `F${index}`,
    point: [51.45, -0.15 + index * 0.001],
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [index, 0],
          [index + size, 0],
          [index + size, size],
          [index, size],
          [index, 0],
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

describe("useMatchingCatalog LOD", () => {
  beforeEach(() => {
    buildMatchingEliminationRegion.mockReset();
    buildSameNearestRegion.mockReset();
    buildCoarsePolygonFeature.mockReset();
    refinePolygonFeatureStep.mockReset();
    buildSameNearestRegion.mockResolvedValue(samplePolygon());
    buildMatchingEliminationRegion.mockResolvedValue(samplePolygon());
    buildCoarsePolygonFeature.mockImplementation((feature) => feature);
    refinePolygonFeatureStep.mockImplementation((full) => ({
      feature: full,
      done: true,
    }));
  });

  it("paints coarse then complete elim for a 20-feature catalog", async () => {
    const features = Array.from({ length: 20 }, (_, i) =>
      featureWithArea(i, 20 - i),
    );
    const { result } = renderHook(() =>
      useMatchingCatalog({
        activeAnnotations: [],
        pendingQuestions: [],
        matchingCategoryId: "commercial_airport",
        matchingFeatures: features,
        matchingNearestFeatureId: "f-0",
        matchingNullAnswer: false,
        matchingAnswer: "yes",
        gameArea,
      }),
    );

    await waitFor(() => {
      expect(["coarse", "refining"]).toContain(result.current.matchingLodPhase);
    });
    await waitFor(() => {
      expect(result.current.matchingLodPhase).toBe("complete");
    });
    expect(result.current.matchingEliminationPreview).not.toBeNull();

    const lengths = buildMatchingEliminationRegion.mock.calls.map(
      (call) => (call[0] as MatchingFeature[]).length,
    );
    expect(lengths[0]).toBe(16);
    expect(lengths.at(-1)).toBe(20);
  });

  it("uses the 16 largest features as the coarse prefix", async () => {
    const features = Array.from({ length: 20 }, (_, i) =>
      featureWithArea(i, i + 1),
    );
    renderHook(() =>
      useMatchingCatalog({
        activeAnnotations: [],
        pendingQuestions: [],
        matchingCategoryId: "commercial_airport",
        matchingFeatures: features,
        matchingNearestFeatureId: "f-19",
        matchingNullAnswer: false,
        matchingAnswer: "yes",
        gameArea,
      }),
    );

    await waitFor(() => {
      expect(buildMatchingEliminationRegion).toHaveBeenCalled();
    });

    const prefix = buildMatchingEliminationRegion.mock.calls[0]![0] as MatchingFeature[];
    expect(prefix).toHaveLength(16);
    const ids = prefix.map((feature) => feature.id);
    expect(ids).toContain("f-19");
    expect(ids).not.toContain("f-0");
  });
});
