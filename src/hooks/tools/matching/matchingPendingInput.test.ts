import { describe, expect, it } from "vitest";
import type { MatchingFeature } from "@/domain/geo/types";
import { buildMatchingPendingInput } from "./matchingPendingInput";

const line: MatchingFeature = { id: "line-1", name: "Line 1", point: [51.5, -0.12] };

describe("buildMatchingPendingInput", () => {
  it("builds the transit line payload with the nearest feature and metro id", () => {
    expect(
      buildMatchingPendingInput({
        seekerPoint: [51.45, -0.15],
        categoryId: "transit_line",
        customCategories: [],
        nullAnswer: false,
        nearestFeatureId: "line-1",
        nearestFeatureName: "Line 1",
        nearestFeaturePoint: [51.5, -0.12],
        distanceMeters: 1200,
        featureCount: 1,
        features: [line],
        transitMetroId: "london",
        cardDraw: 2,
        cardKeep: 1,
      }),
    ).toEqual({
      promptText: "Is your nearest transit line the same as my nearest transit line?",
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          matchingCategory: "transit_line",
          matchingAnchor: { lat: 51.45, lng: -0.15 },
          matchingNearestFeatureId: "line-1",
          matchingNearestFeatureName: "Line 1",
          matchingNearestFeaturePoint: { lat: 51.5, lng: -0.12 },
          matchingDistanceMeters: 1200,
          matchingFeatureCount: 1,
          matchingNullAnswer: false,
          matchingFeaturesJson: JSON.stringify([line]),
          transitMetroId: "london",
        },
      },
      cardDraw: 2,
      cardKeep: 1,
    });
  });

  it("adds the null reply and omits the metro id for a null answer", () => {
    const result = buildMatchingPendingInput({
      seekerPoint: [51.45, -0.15],
      categoryId: "commercial_airport",
      customCategories: [],
      nullAnswer: true,
      nearestFeatureId: null,
      nearestFeatureName: null,
      nearestFeaturePoint: null,
      distanceMeters: null,
      featureCount: 1,
      features: [line],
      transitMetroId: null,
      cardDraw: undefined,
      cardKeep: undefined,
    });

    expect(result.replyOptions).toEqual([
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "null", label: "Null (not in play area)" },
    ]);
    expect(result.placement.metadata).not.toHaveProperty("transitMetroId");
    expect(result.placement.metadata).toMatchObject({
      matchingNearestFeatureId: undefined,
      matchingNearestFeaturePoint: undefined,
      matchingNullAnswer: true,
    });
  });
});
